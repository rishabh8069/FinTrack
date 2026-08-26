import { Router, Request, Response } from 'express';
import { parseTransactionMessage } from '../services/transactionParser';
import { saveParsedTransaction } from '../services/transactionPersistence';
import {
    createPendingTransaction,
    getPendingTransaction,
    clearPendingTransaction,
    isConfirmation,
    isRejection,
    formatTransactionConfirmation,
} from '../services/transactionConfirmation';

import { sendWhatsAppMessage } from '../services/whatsappService';
import { ChatMessageModel } from '../models/ChatMessage';

const router = Router();

console.log(
    '[WHATSAPP] Verify token loaded:',
    !!process.env.WHATSAPP_VERIFY_TOKEN,
    'length:',
    process.env.WHATSAPP_VERIFY_TOKEN?.length
);


router.get('/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WHATSAPP] Webhook verification request');
    console.log('[WHATSAPP] Mode:', mode);
    console.log('[WHATSAPP] Token received:', token);
    console.log(
        '[WHATSAPP] Token expected:',
        process.env.WHATSAPP_VERIFY_TOKEN
    );
    console.log(
        '[WHATSAPP] Token match:',
        token === process.env.WHATSAPP_VERIFY_TOKEN
    );
    console.log('[WHATSAPP] Challenge:', challenge);

    if (
        mode === 'subscribe' &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
        console.log('[WHATSAPP] Webhook verified successfully');

        return res.status(200).send(challenge);
    }

    console.error('[WHATSAPP] Webhook verification failed');

    return res.sendStatus(403);
});

router.post('/test-parser', async (req: Request, res: Response) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'text is required',
            });
        }

        console.log('[PARSER] Input:', text);

        const result = await parseTransactionMessage(text);

        console.log('[PARSER] Result:', JSON.stringify(result, null, 2));

        return res.status(200).json({
            success: true,
            input: text,
            parsed: result,
        });
    } catch (error) {
        console.error('[PARSER] Test failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Parser failed',
        });
    }
});

router.post('/webhook', async (req: Request, res: Response) => {
    console.log('[WHATSAPP] Incoming webhook received');

    try {
        const body = req.body;

        console.log(
            '[WHATSAPP] Payload:',
            JSON.stringify(body, null, 2)
        );

        const entries = body?.entry;

        if (!Array.isArray(entries)) {
            console.log('[WHATSAPP] No entry array found');
            return res.sendStatus(200);
        }

        for (const entry of entries) {
            const changes = entry?.changes;

            if (!Array.isArray(changes)) {
                continue;
            }

            for (const change of changes) {
                const value = change?.value;

                if (!value) {
                    continue;
                }

                const messages = value?.messages;

                if (!Array.isArray(messages)) {
                    console.log(
                        '[WHATSAPP] Webhook event contains no messages'
                    );
                    continue;
                }

                for (const message of messages) {

                    const sender = message?.from;
                    const whatsappMessageId = message?.id;

                    let text = '';

                    if (message?.type === 'text') {
                        text = message?.text?.body || '';
                    }

                    console.log('[WHATSAPP] Message received');
                    console.log('[WHATSAPP] Sender:', sender);
                    console.log('[WHATSAPP] Message ID:', whatsappMessageId);
                    console.log('[WHATSAPP] Type:', message?.type);
                    console.log('[WHATSAPP] Text:', text);

                    if (!sender || !text) {
                        console.log(
                            '[WHATSAPP] Message ignored: missing sender or text'
                        );
                        continue;
                    }

                    // --------------------------------------------------
                    // SAVE USER MESSAGE TO MONGODB
                    // --------------------------------------------------

                    const businessId =
                        process.env.WHATSAPP_BUSINESS_ID ||
                        'business_demo';

                    await ChatMessageModel.create({
                        id: `chat_${Date.now()}_${Math.random()
                            .toString(36)
                            .substring(2, 8)}`,

                        businessId,

                        sender: 'user',

                        text,

                        timestamp: new Date().toISOString(),

                        type: message?.type,

                        status: 'received',

                        transactionData: undefined,

                        extractedDetails: undefined,
                    });

                    console.log(
                        '[MONGODB] User WhatsApp message saved'
                    );

                    // --------------------------------------------------
                    // CHECK PENDING TRANSACTION
                    // --------------------------------------------------

                    const pendingTransaction =
                        getPendingTransaction(sender);

                    // ==================================================
                    // 1. YES / CONFIRMATION
                    // ==================================================

                    if (
                        pendingTransaction &&
                        isConfirmation(text)
                    ) {

                        console.log(
                            '[CONFIRMATION] User confirmed transaction'
                        );

                        const transaction =
                            pendingTransaction.transaction;

                        console.log(
                            '[CONFIRMATION] Transaction:',
                            JSON.stringify(
                                transaction,
                                null,
                                2
                            )
                        );

                        // ------------------------------------------------
                        // SAVE TRANSACTION TO MONGODB
                        // ------------------------------------------------

                        const persistenceResult =
                            await saveParsedTransaction({
                                businessId,

                                whatsappMessageId:
                                    pendingTransaction.whatsappMessageId,

                                originalText:
                                    pendingTransaction.originalText,

                                parsed: transaction,
                            });

                        console.log(
                            '[MONGODB] Persistence result:',
                            JSON.stringify(
                                persistenceResult,
                                null,
                                2
                            )
                        );

                        clearPendingTransaction(sender);

                        // ------------------------------------------------
                        // SEND SUCCESS MESSAGE
                        // ------------------------------------------------

                        const successMessage =
                            persistenceResult.saved
                                ? '✅ Transaction recorded successfully!'
                                : persistenceResult.duplicate
                                    ? 'ℹ️ This transaction was already recorded.'
                                    : '⚠️ I could not record this transaction.';

                        const sendResult =
                            await sendWhatsAppMessage(
                                sender,
                                successMessage
                            );

                        console.log(
                            '[WHATSAPP] Confirmation response:',
                            JSON.stringify(
                                sendResult,
                                null,
                                2
                            )
                        );

                        // ------------------------------------------------
                        // SAVE BOT RESPONSE TO CHAT
                        // ------------------------------------------------

                        await ChatMessageModel.create({
                            id: `chat_${Date.now()}_${Math.random()
                                .toString(36)
                                .substring(2, 8)}`,

                            businessId,

                            sender: 'bot',

                            text: successMessage,

                            timestamp:
                                new Date().toISOString(),

                            type: 'text',

                            status: 'sent',

                            transactionData:
                                transaction,
                        });

                        console.log(
                            '[MONGODB] Bot confirmation saved'
                        );

                        console.log(
                            '[CONFIRMATION] Transaction confirmed successfully'
                        );

                        continue;
                    }

                    // ==================================================
                    // 2. NO / REJECTION
                    // ==================================================

                    if (
                        pendingTransaction &&
                        isRejection(text)
                    ) {

                        console.log(
                            '[CONFIRMATION] User rejected transaction'
                        );

                        clearPendingTransaction(sender);

                        const cancellationMessage =
                            '❌ Transaction cancelled. Nothing was recorded.';

                        // ------------------------------------------------
                        // SEND CANCELLATION MESSAGE
                        // ------------------------------------------------

                        const sendResult =
                            await sendWhatsAppMessage(
                                sender,
                                cancellationMessage
                            );

                        console.log(
                            '[WHATSAPP] Cancellation response:',
                            JSON.stringify(
                                sendResult,
                                null,
                                2
                            )
                        );

                        // ------------------------------------------------
                        // SAVE BOT RESPONSE TO CHAT
                        // ------------------------------------------------

                        await ChatMessageModel.create({
                            id: `chat_${Date.now()}_${Math.random()
                                .toString(36)
                                .substring(2, 8)}`,

                            businessId,

                            sender: 'bot',

                            text: cancellationMessage,

                            timestamp:
                                new Date().toISOString(),

                            type: 'text',

                            status: 'sent',
                        });

                        console.log(
                            '[MONGODB] Bot cancellation saved'
                        );

                        console.log(
                            '[CONFIRMATION] Transaction cancelled'
                        );

                        continue;
                    }

                    // ==================================================
                    // 3. NEW MESSAGE → AI PARSER
                    // ==================================================

                    console.log(
                        '[PARSER] Parsing WhatsApp message...'
                    );

                    const parsedTransaction =
                        await parseTransactionMessage(text);

                    console.log(
                        '[PARSER] Result:',
                        JSON.stringify(
                            parsedTransaction,
                            null,
                            2
                        )
                    );

                    // ==================================================
                    // 4. TRANSACTION DETECTED
                    // ==================================================

                    if (parsedTransaction.isTransaction) {

                        createPendingTransaction(
                            sender,
                            parsedTransaction,
                            message.id,
                            text
                        );
                        const confirmationMessage =
                            formatTransactionConfirmation(
                                parsedTransaction
                            );

                        console.log(
                            '[CONFIRMATION] Sending confirmation message to:',
                            sender
                        );

                        await sendWhatsAppMessage(
                            sender,
                            confirmationMessage
                        );

                        console.log(
                            '[CONFIRMATION] Confirmation message sent successfully'
                        );

                        continue;

                        // ------------------------------------------------
                        // SEND CONFIRMATION TO WHATSAPP
                        // ------------------------------------------------

                        const sendResult =
                            await sendWhatsAppMessage(
                                sender,
                                confirmationMessage
                            );

                        console.log(
                            '[WHATSAPP] Confirmation sent:',
                            JSON.stringify(
                                sendResult,
                                null,
                                2
                            )
                        );

                        // ------------------------------------------------
                        // SAVE BOT CONFIRMATION TO MONGODB
                        // ------------------------------------------------

                        await ChatMessageModel.create({
                            id: `chat_${Date.now()}_${Math.random()
                                .toString(36)
                                .substring(2, 8)}`,

                            businessId,

                            sender: 'bot',

                            text: confirmationMessage,

                            timestamp:
                                new Date().toISOString(),

                            type: 'text',

                            status: 'sent',

                            transactionData:
                                parsedTransaction,

                            extractedDetails:
                                parsedTransaction,
                        });

                        console.log(
                            '[MONGODB] Bot confirmation saved'
                        );

                        continue;
                    }

                    // ==================================================
                    // 5. NOT A TRANSACTION
                    // ==================================================

                    console.log(
                        '[PARSER] Message is not a transaction'
                    );
                }
            }
        }

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            '[WHATSAPP] Error processing webhook:',
            error
        );

        // Always acknowledge WhatsApp webhook
        return res.sendStatus(200);
    }
});


router.post('/test-send', async (req: Request, res: Response) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'phone and message are required',
            });
        }

        const result = await sendWhatsAppMessage(
            phone,
            message
        );

        return res.status(
            result.success ? 200 : 500
        ).json(result);

    } catch (error) {
        console.error(
            '[WHATSAPP] Test send failed:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to send WhatsApp message',
        });
    }
});

export default router;