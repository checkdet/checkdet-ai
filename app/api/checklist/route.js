import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://checkdet.dk",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const question = String(
      body?.message ||
      body?.question ||
      "Lav en praktisk huskeseddel med relevante punkter."
    );

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Du laver korte, konkrete tjeklister i punktform på dansk." },
          { role: "user", content: question }
        ],
        temperature: 0.4,
      }),
    });

    const data = await r.json();

    return new NextResponse(
      JSON.stringify({
        answer: data.choices?.[0]?.message?.content || "",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        error: "Serverfejl",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}
