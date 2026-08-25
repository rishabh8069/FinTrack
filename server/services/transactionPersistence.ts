import crypto from 'crypto';
import { TransactionModel } from '../models/Transaction';
import { ClientModel } from '../models/Client';


interface ParsedTransaction {
    isTransaction: boolean;
    type: 'income' | 'expense' | 'payment_received' | 'unknown';
    amount: number | null;
    category: string | null;
    description: string | null;
    clientName: string | null;
    confidence: number;
}

interface SaveTransactionOptions {
    businessId: string;
    whatsappMessageId?: string;
    originalText: string;
    parsed: ParsedTransaction;
}

export async function saveParsedTransaction({
    businessId,
    whatsappMessageId,
    originalText,
    parsed,
}: SaveTransactionOptions) {

    // Don't save messages that AI did not identify as transactions
    if (!parsed.isTransaction || !parsed.amount) {
        return {
            saved: false,
            reason: 'Not a transaction',
        };
    }

    // Prevent duplicate WhatsApp webhook processing
    if (whatsappMessageId) {
        const existing = await TransactionModel.findOne({
            whatsappMessageId,
            businessId,
        });

        if (existing) {
            return {
                saved: false,
                duplicate: true,
                transaction: existing,
            };
        }
    }

    // Find client if AI extracted a client name
    let client = null;

    if (parsed.clientName) {
        client = await ClientModel.findOne({
            businessId,
            name: {
                $regex: `^${parsed.clientName}$`,
                $options: 'i',
            },
        });
    }

    if (client) {
        console.log(
            '[MONGODB] Client matched:',
            client.name,
            '| Client ID:',
            client.id,
            '| Business ID:',
            businessId
        );
    } else if (parsed.clientName) {
        console.log(
            '[MONGODB] Client not found:',
            parsed.clientName,
            '| Business ID:',
            businessId
        );
    }

    const now = new Date().toISOString();

    console.log(
        '[MONGODB] Creating transaction for business:',
        businessId
    );

    const transaction = await TransactionModel.create({
        id: `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,

        businessId,

        type: parsed.type,

        amount: parsed.amount,

        currency: '₹',

        clientId: client?.id,

        clientName: parsed.clientName || undefined,

        category: parsed.category || 'other',

        description:
            parsed.description || originalText,

        date: now,

        source: 'whatsapp',

        whatsappMessageId,

        createdAt: now,
    });

    console.log(
        '[MONGODB] Transaction created:',
        transaction.id
    );

    // Update client ledger for payments received
    if (client && parsed.type === 'payment_received') {

        client.totalReceived += parsed.amount;

        client.outstanding =
            Math.max(
                0,
                client.totalBilled - client.totalReceived
            );

        client.lastTransactionDate = now;

        if (client.outstanding === 0) {
            client.status = 'cleared';
        } else {
            client.status = 'active';
        }

        await client.save();
    }

    return {
        saved: true,
        transaction,
        clientUpdated: !!client,
    };

    await client.save();

    console.log(
        '[MONGODB] Client ledger updated:',
        client.name,
        '| Received:',
        client.totalReceived,
        '| Outstanding:',
        client.outstanding,
        '| Status:',
        client.status
    );
}