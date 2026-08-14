const { getAccessToken } = require("./graph.service");

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }

  return value;
}

async function enviarCorreoPorGraph({
  to,
  subject,
  html,
  pdfBuffer,
  nombre = "inspeccion-sst.pdf",
}) {
  const token = await getAccessToken();
  const remitente = getRequiredEnv("ONEDRIVE_USER_ID");

  const emailBody = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: html,
      },
      toRecipients: (Array.isArray(to) ? to : to.split(","))
        .map((addr) => addr.trim())
        .filter(Boolean)
        .map((addr) => ({ emailAddress: { address: addr } })),
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: nombre,
          contentBytes: pdfBuffer.toString("base64"),
        },
      ],
    },
    saveToSentItems: true,
  };

  // Enviar correo
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(remitente)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    const detail = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Error enviando correo por Graph: ${detail}`);
  }
}

module.exports = {
  enviarCorreoPorGraph,
};
