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

                    let text = '';

                    if (message?.type === 'text') {
                        text = message?.text?.body || '';
                    }

                    console.log('[WHATSAPP] Message received');
                    console.log('[WHATSAPP] Sender:', sender);
                    console.log('[WHATSAPP] Type:', message?.type);
                    console.log('[WHATSAPP] Text:', text);

                    if (!sender || !text) {
                        console.log(
                            '[WHATSAPP] Message ignored: missing sender or text'
                        );
                        continue;
                    }

                    console.log(
                        '[WHATSAPP] Message successfully received by FinTrack'
                    );

                    // Parse the WhatsApp message using AI
                    const parsed = await parseTransactionMessage(text);

                    console.log(
                        '[PARSER] Parsed transaction:',
                        JSON.stringify(parsed, null, 2)
                    );

                    // Save transaction to MongoDB
                    const businessId = process.env.WHATSAPP_BUSINESS_ID;

                    if (!businessId) {
                        throw new Error(
                            'WHATSAPP_BUSINESS_ID is not configured'
                        );
                    }

                    const saved = await saveParsedTransaction({
                        businessId,
                        originalText: text,
                        parsed,
                        whatsappMessageId: message?.id,
                    });

                    console.log(
                        '[MONGODB] Persistence result:',
                        JSON.stringify(saved, null, 2)
                    );

                    // --------------------------------------------------
                    // CONFIRMATION FLOW
                    // --------------------------------------------------

                    const pendingTransaction = getPendingTransaction(sender);

                    // --------------------------------------------------
                    // 1. USER IS CONFIRMING A PREVIOUS TRANSACTION
                    // --------------------------------------------------

                    if (pendingTransaction && isConfirmation(text)) {
                        console.log('[CONFIRMATION] User confirmed transaction');

                        console.log(
                            '[CONFIRMATION] Transaction:',
                            JSON.stringify(
                                pendingTransaction.transaction,
                                null,
                                2
                            )
                        );

                        /*
                         * MongoDB transaction creation will be implemented
                         * after we verify the confirmation flow.
                         */

                        clearPendingTransaction(sender);

                        console.log(
                            '[CONFIRMATION] Transaction confirmed successfully'
                        );

                        continue;
                    }

                    // --------------------------------------------------
                    // 2. USER IS REJECTING A PREVIOUS TRANSACTION
                    // --------------------------------------------------

                    if (pendingTransaction && isRejection(text)) {
                        console.log('[CONFIRMATION] User rejected transaction');

                        clearPendingTransaction(sender);

                        console.log(
                            '[CONFIRMATION] Transaction cancelled'
                        );

                        continue;
                    }

                    // --------------------------------------------------
                    // 3. NEW MESSAGE → SEND TO AI PARSER
                    // --------------------------------------------------

                    console.log('[PARSER] Parsing WhatsApp message...');

                    const parsedTransaction = await parseTransactionMessage(text);

                    console.log(
                        '[PARSER] Result:',
                        JSON.stringify(parsedTransaction, null, 2)
                    );

                    // --------------------------------------------------
                    // 4. IF IT IS A TRANSACTION → CREATE PENDING STATE
                    // --------------------------------------------------

                    if (parsedTransaction.isTransaction) {
                        createPendingTransaction(
                            sender,
                            parsedTransaction
                        );

                        const confirmationMessage =
                            formatTransactionConfirmation(
                                parsedTransaction
                            );

                        console.log(
                            '[CONFIRMATION] Confirmation message:'
                        );

                        console.log(confirmationMessage);

                        continue;
                    }

                    // --------------------------------------------------
                    // 5. NOT A TRANSACTION
                    // --------------------------------------------------

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

        return res.sendStatus(200);
    }
});

export default router;