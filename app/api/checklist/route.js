import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const question = String(
      body.question ||
      body.message ||
      "Lav en praktisk huskeseddel med relevante punkter."
    );

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Du laver korte, konkrete tjeklister i punktform på dansk."
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.4
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: "OpenAI fejl", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      answer: data.choices[0].message.content
    });

  } catch (e) {
    return NextResponse.json(
      { error: "Serverfejl", details: e.message },
      { status: 500 }
    );
  }
}
