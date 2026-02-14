import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runFunctionCallingLoop } from "@/lib/ai/functionCalling";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts/chatSystem";
import type { ChatMessage } from "@/lib/ai/aiProvider";

// POST: 메시지 전송 + 함수 호출 루프
export async function POST(request: Request) {
  const { sessionId, message } = await request.json();

  if (!sessionId || !message) {
    return NextResponse.json({ error: "sessionId와 message 필요" }, { status: 400 });
  }

  // 세션 확인
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });

  if (!session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다" }, { status: 404 });
  }

  // 사용자 메시지 저장
  const userMsg = await prisma.aiChatMessage.create({
    data: { sessionId, role: "user", content: message },
  });

  // 이전 메시지를 ChatMessage 형식으로 변환
  const chatMessages: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
  ];

  for (const msg of session.messages) {
    if (msg.role === "function") {
      chatMessages.push({ role: "function", content: msg.content, name: msg.functionName ?? "" });
    } else {
      chatMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
  }
  chatMessages.push({ role: "user", content: message });

  try {
    // Function Calling 루프 실행
    const result = await runFunctionCallingLoop(chatMessages);

    // 함수 호출 메시지 저장
    const savedFunctionMessages = [];
    for (const fc of result.functionCalls) {
      const funcMsg = await prisma.aiChatMessage.create({
        data: {
          sessionId,
          role: "function",
          content: JSON.stringify(fc.result),
          functionName: fc.name,
          functionArgs: JSON.stringify(fc.args),
          functionResult: JSON.stringify(fc.result),
        },
      });
      savedFunctionMessages.push(funcMsg);
    }

    // AI 응답 저장
    const assistantMsg = await prisma.aiChatMessage.create({
      data: { sessionId, role: "assistant", content: result.finalContent },
    });

    // 첫 메시지면 세션 제목 업데이트
    if (session.messages.length === 0) {
      const title = message.length > 30 ? message.substring(0, 30) + "..." : message;
      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    return NextResponse.json({
      userMessage: userMsg,
      functionCalls: result.functionCalls,
      functionMessages: savedFunctionMessages,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "AI 응답 생성 실패";
    const assistantMsg = await prisma.aiChatMessage.create({
      data: { sessionId, role: "assistant", content: `오류: ${errorMsg}` },
    });

    return NextResponse.json({
      userMessage: userMsg,
      functionCalls: [],
      functionMessages: [],
      assistantMessage: assistantMsg,
      error: errorMsg,
    });
  }
}
