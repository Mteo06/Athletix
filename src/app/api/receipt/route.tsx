import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#0f172a" },
  header: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 10, color: "#64748b", marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#64748b" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginVertical: 16 },
  total: { fontSize: 16, fontWeight: 700, marginTop: 8 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, fontSize: 9, color: "#94a3b8", textAlign: "center" },
});

/**
 * GET /api/receipt?orderId=...&receiptNumber=...&athlete=...&item=...&amount=...&method=...&org=...
 * Genera una ricevuta PDF scaricabile per una vendita conclusa dallo Store.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const receiptNumber = params.get("receiptNumber") ?? "RIC-000000";
  const athlete = params.get("athlete") ?? "Cliente";
  const item = params.get("item") ?? "Servizio";
  const amountCents = Number(params.get("amount") ?? 0);
  const method = params.get("method") ?? "CASSA";
  const org = params.get("org") ?? "Athletix";

  const amount = (amountCents / 100).toFixed(2);
  const date = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A5", style: styles.page },
      React.createElement(Text, { style: styles.header }, org),
      React.createElement(Text, { style: styles.sub }, `Ricevuta di pagamento — ${date}`),

      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Numero ricevuta"),
        React.createElement(Text, {}, receiptNumber)
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Cliente"),
        React.createElement(Text, {}, athlete)
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Metodo di pagamento"),
        React.createElement(Text, {}, method === "POS" ? "POS (simulato)" : method)
      ),

      React.createElement(View, { style: styles.divider }),

      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, {}, item),
        React.createElement(Text, {}, `€ ${amount}`)
      ),

      React.createElement(View, { style: styles.divider }),

      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.total }, "Totale pagato"),
        React.createElement(Text, { style: styles.total }, `€ ${amount}`)
      ),

      React.createElement(
        Text,
        { style: styles.footer },
        "Documento generato automaticamente da Athletix — non valido ai fini fiscali senza integrazione con registratore telematico."
      )
    )
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${receiptNumber}.pdf"`,
    },
  });
}
