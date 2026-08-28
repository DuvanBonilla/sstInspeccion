const {
  pool,
} = require("../db/pool");

const TIPO_ALERTA_EPP =
  "EPP_DIARIA";

function validarDatosEnvio({
  destinatario,
  totalPlanes,
}) {
  const destinatarioNormalizado =
    String(destinatario || "").trim();

  const totalNormalizado =
    Number(totalPlanes);

  if (!destinatarioNormalizado) {
    throw new Error(
      "El destinatario de la alerta EPP es obligatorio",
    );
  }

  if (
    !Number.isInteger(totalNormalizado)
    || totalNormalizado < 0
  ) {
    throw new Error(
      "El total de planes de la alerta EPP no es válido",
    );
  }

  return {
    destinatario:
      destinatarioNormalizado,

    totalPlanes:
      totalNormalizado,
  };
}

async function reservarEnvioAlertaEpp({
  destinatario,
  totalPlanes,
}) {
  const datos = validarDatosEnvio({
    destinatario,
    totalPlanes,
  });

  const result = await pool.query(
    `
    WITH fecha_actual AS (
      SELECT
        (
          CURRENT_TIMESTAMP
          AT TIME ZONE 'America/Bogota'
        )::date AS fecha_colombia
    ),

    reserva AS (
      INSERT INTO
        public.alertas_epp_envios (
          fecha_alerta,
          tipo_alerta,
          estado,
          destinatario,
          total_planes,
          intentos,
          enviado_at,
          ultimo_error,
          created_at,
          updated_at
        )

      SELECT
        fecha_colombia,
        $1,
        'EN_PROCESO',
        $2,
        $3,
        1,
        NULL,
        NULL,
        now(),
        now()

      FROM fecha_actual

      ON CONFLICT (
        fecha_alerta,
        tipo_alerta
      )

      DO UPDATE SET
        estado = 'EN_PROCESO',

        destinatario =
          EXCLUDED.destinatario,

        total_planes =
          EXCLUDED.total_planes,

        intentos =
          alertas_epp_envios.intentos + 1,

        enviado_at = NULL,

        ultimo_error = NULL,

        updated_at = now()

      WHERE
        alertas_epp_envios.estado
        = 'FALLIDO'

      RETURNING *
    )

    SELECT
      TRUE AS reservado,
      reserva.*

    FROM reserva

    UNION ALL

    SELECT
      FALSE AS reservado,
      envio.*

    FROM public.alertas_epp_envios envio

    CROSS JOIN fecha_actual

    WHERE
      envio.fecha_alerta =
        fecha_actual.fecha_colombia

      AND envio.tipo_alerta = $1

      AND NOT EXISTS (
        SELECT 1
        FROM reserva
      )

    LIMIT 1
    `,
    [
      TIPO_ALERTA_EPP,
      datos.destinatario,
      datos.totalPlanes,
    ],
  );

  const registro =
    result.rows[0] || null;

  if (!registro) {
    throw new Error(
      "No fue posible reservar el envío de la alerta EPP",
    );
  }

  return {
    reservado:
      registro.reservado === true,

    registro,
  };
}

async function marcarEnvioAlertaEppComoEnviado() {
  const result = await pool.query(
    `
    UPDATE public.alertas_epp_envios

    SET
      estado = 'ENVIADO',
      enviado_at = now(),
      ultimo_error = NULL,
      updated_at = now()

    WHERE
      fecha_alerta = (
        CURRENT_TIMESTAMP
        AT TIME ZONE 'America/Bogota'
      )::date

      AND tipo_alerta = $1

      AND estado = 'EN_PROCESO'

    RETURNING *
    `,
    [
      TIPO_ALERTA_EPP,
    ],
  );

  return result.rows[0] || null;
}

async function marcarEnvioAlertaEppComoFallido(
  error,
) {
  const mensaje = String(
    error instanceof Error
      ? error.message
      : error || "Error desconocido",
  ).trim();

  const result = await pool.query(
    `
    UPDATE public.alertas_epp_envios

    SET
      estado = 'FALLIDO',
      enviado_at = NULL,
      ultimo_error = $2,
      updated_at = now()

    WHERE
      fecha_alerta = (
        CURRENT_TIMESTAMP
        AT TIME ZONE 'America/Bogota'
      )::date

      AND tipo_alerta = $1

      AND estado = 'EN_PROCESO'

    RETURNING *
    `,
    [
      TIPO_ALERTA_EPP,
      mensaje,
    ],
  );

  return result.rows[0] || null;
}

async function obtenerEnvioAlertaEppDeHoy() {
  const result = await pool.query(
    `
    SELECT
      fecha_alerta,
      tipo_alerta,
      estado,
      destinatario,
      total_planes,
      intentos,
      enviado_at,
      ultimo_error,
      created_at,
      updated_at

    FROM public.alertas_epp_envios

    WHERE
      fecha_alerta = (
        CURRENT_TIMESTAMP
        AT TIME ZONE 'America/Bogota'
      )::date

      AND tipo_alerta = $1
    `,
    [
      TIPO_ALERTA_EPP,
    ],
  );

  return result.rows[0] || null;
}

module.exports = {
  TIPO_ALERTA_EPP,
  reservarEnvioAlertaEpp,
  marcarEnvioAlertaEppComoEnviado,
  marcarEnvioAlertaEppComoFallido,
  obtenerEnvioAlertaEppDeHoy,
};