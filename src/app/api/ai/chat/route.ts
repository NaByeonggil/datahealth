import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runFunctionCallingLoop } from "@/lib/ai/functionCalling";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts/chatSystem";
import type { ChatMessage } from "@/lib/ai/aiProvider";

/** 모델에 다시 보내는 이전 대화 수 */
const HISTORY_LIMIT = 20;
/** 실패한 턴의 표시 — 이전 대화로 다시 보내지 않는다 */
const ERROR_PREFIX = "오류:";

// POST: 메시지 전송 + 함수 호출 루프
export async function POST(request: Request) {
  const { sessionId, message } = await request.json();

  if (!sessionId || !message) {
    return NextResponse.json({ error: "sessionId와 message 필요" }, { status: 400 });
  }

  // 세션 확인
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    // 도구 호출 내역은 다시 보내지 않는다 — 답변에 요약돼 있고, 로컬 모델은 컨텍스트가 작다
    include: {
      messages: {
        where: { role: { in: ["user", "assistant"] } },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
      },
    },
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

  for (const msg of [...session.messages].reverse()) {
    if (msg.role === "assistant" && msg.content.startsWith(ERROR_PREFIX)) continue;
    chatMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
  }
  chatMessages.push({ role: "user", content: message });

  try {
    // Function Calling 루프 실행
    const result = await runFunctionCallingLoop(chatMessages, { relatedId: sessionId });

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

    // 첫 메시지면 세션 제목 업데이트. 아니어도 갱신 시각은 당겨 목록 맨 위로 올린다.
    const isFirst = session.messages.length === 0;
    await prisma.aiChatSession.update({
      where: { id: sessionId },
      data: isFirst
        ? { title: message.length > 30 ? message.substring(0, 30) + "..." : message }
        : { updatedAt: new Date() },
    });

    return NextResponse.json({
      userMessage: userMsg,
      functionCalls: result.functionCalls,
      functionMessages: savedFunctionMessages,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "AI 응답 생성 실패";
    const assistantMsg = await prisma.aiChatMessage.create({
      data: { sessionId, role: "assistant", content: `${ERROR_PREFIX} ${errorMsg}` },
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
