import { redirect } from "next/navigation";
import { factorySiteUrl } from "@/lib/integration/factory";

// 고객 창구는 홈페이지로 일원화했다. 예전 주소(/inquiry, /inquiry/check)는 그쪽 문의 페이지로 보낸다.
export const dynamic = "force-dynamic";

export default function InquiryRedirect() {
  redirect(`${factorySiteUrl()}/ko/inquiry`);
}
