const GRAPH_API_VERSION =
    process.env.META_GRAPH_API_VERSION || 'v25.0';

const WHATSAPP_ACCESS_TOKEN =
    process.env.WHATSAPP_ACCESS_TOKEN;

const WHATSAPP_PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendWhatsAppText(
    to: string,
    message: string
) {
    if (!WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
    }

    if (!WHATSAPP_PHONE_NUMBER_ID) {
        throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured');
    }

    const url =
        `https://graph.facebook.com/${GRAPH_API_VERSION}` +
        `/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: {
                body: message,
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('[WHATSAPP] Send message failed:', data);
        throw new Error(
            data?.error?.message || 'WhatsApp message failed'
        );
    }

    console.log('[WHATSAPP] Message sent:', data);

    return data;
}