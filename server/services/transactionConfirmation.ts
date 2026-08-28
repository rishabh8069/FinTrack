import { ParsedTransaction } from './transactionParser';

interface PendingTransaction {
    phoneNumber: string;
    transaction: ParsedTransaction;
    whatsappMessageId?: string;
    originalText?: string;
    createdAt: number;
}

const pendingTransactions = new Map<string, PendingTransaction>();

export const createPendingTransaction = (
    phoneNumber: string,
    transaction: ParsedTransaction,
    whatsappMessageId?: string,
    originalText?: string
) => {
    pendingTransactions.set(phoneNumber, {
        phoneNumber,
        transaction,
        whatsappMessageId,
        originalText,
        createdAt: Date.now(),
    });

    console.log(
        '[CONFIRMATION] Pending transaction created for:',
        phoneNumber
    );
};

export const getPendingTransaction = (phoneNumber: string) => {
    return pendingTransactions.get(phoneNumber);
};

export const clearPendingTransaction = (phoneNumber: string) => {
    pendingTransactions.delete(phoneNumber);

    console.log(
        '[CONFIRMATION] Pending transaction cleared for:',
        phoneNumber
    );
};

export const isConfirmation = (text: string): boolean => {
    const normalized = text.trim().toLowerCase();

    return [
        'yes',
        'y',
        'confirm',
        'confirmed',
        'save',
        'record',
        'haan',
        'ha',
    ].includes(normalized);
};

export const isRejection = (text: string): boolean => {
    const normalized = text.trim().toLowerCase();

    return [
        'no',
        'n',
        'cancel',
        'reject',
        'discard',
        'nahi',
        'nah',
    ].includes(normalized);
};

export const formatTransactionConfirmation = (
    transaction: ParsedTransaction
): string => {
    const typeLabel =
        transaction.type === 'payment_received'
            ? '💰 Payment received'
            : transaction.type === 'income'
                ? '💰 Income'
                : transaction.type === 'expense'
                    ? '💸 Expense'
                    : '📝 Transaction';

    return `Transaction detected:

${typeLabel}
Amount: ₹${transaction.amount ?? 'Not specified'}
${transaction.clientName ? `Client: ${transaction.clientName}\n` : ''}Category: ${transaction.category || 'Not specified'}
Description: ${transaction.description || 'Not specified'}

Should I record this transaction?

Reply YES to confirm or NO to cancel.`;
};