/**
 * 건강기능식품 공전(고시형) 원료 — 기본 기준표와 원료명 매칭 규칙
 *
 * 매칭: 원료명을 정규화(소문자, 공백·기호 제거)한 뒤 keywords 중 하나라도 들어 있고
 * excludes 는 하나도 없으면 그 공전 원료로 본다. 취급품목은 refCode 가 공전 번호
 * (예: "2-2")와 같으면 키워드와 상관없이 묶는다. 한 원료가 여러 공전 원료에
 * 걸릴 수 있다 (예: 아스코브산칼슘 → 비타민C·칼슘).
 *
 * 공전 번호는 확인된 것만 적었다. 번호가 빈 항목은 화면에서 채워 넣으면 된다.
 */

export interface StandardRule {
  id: string;
  code: string | null;
  name: string;
  keywords: string;
  excludes: string | null;
}

export const normalize = (s: string) =>
  s.toLowerCase().replace(/[\s·・()[\]{}\-_,./&+'"*:;~]/g, "").replace(/β/g, "베타");

const split = (s: string | null) =>
  (s ?? "").split(",").map((k) => normalize(k)).filter(Boolean);

/** 원료명·refCode 로 걸리는 공전 원료 id 들 */
export function makeMatcher(standards: StandardRule[]) {
  const rules = standards.map((s) => ({ id: s.id, code: s.code, kw: split(s.keywords), ex: split(s.excludes) }));
  return (name: string, refCode?: string | null): string[] => {
    const n = normalize(name);
    const ref = refCode?.trim();
    return rules
      .filter((r) =>
        (ref && r.code && ref === r.code) ||
        (r.kw.some((k) => n.includes(k)) && !r.ex.some((k) => n.includes(k))))
      .map((r) => r.id);
  };
}

type Seed = [code: string | null, name: string, component: string | null, keywords: string, excludes?: string, note?: string];

const NUTRIENTS: Seed[] = [
  ["1-1", "비타민A", "비타민A", "비타민a,레티놀,retinol,vitamina"],
  ["1-2", "베타카로틴", "베타카로틴", "베타카로틴,betacarotene"],
  ["1-3", "비타민D", "비타민D", "비타민d,콜레칼시페롤,에르고칼시페롤,vitamind,vitd"],
  ["1-4", "비타민E", "비타민E", "비타민e,토코페롤,tocopherol,vitamine,vite"],
  ["1-5", "비타민K", "비타민K", "비타민k,필로퀴논,메나퀴논,vitamink,vitk"],
  ["1-6", "비타민B1", "비타민B1", "비타민b1,티아민,thiamin,vitb1", "비타민b12,vitb12"],
  ["1-7", "비타민B2", "비타민B2", "비타민b2,리보플라빈,riboflavin,vitb2"],
  ["1-8", "나이아신", "나이아신", "나이아신,니아신,니코틴산,niacin"],
  ["1-9", "판토텐산", "판토텐산", "판토텐산,pantothen"],
  ["1-10", "비타민B6", "비타민B6", "비타민b6,피리독신,pyridoxin,vitb6"],
  ["1-11", "엽산", "엽산", "엽산,폴산,folic,folate"],
  ["1-12", "비타민B12", "비타민B12", "비타민b12,코발라민,cobalamin,vitb12"],
  ["1-13", "비오틴", "비오틴", "비오틴,biotin"],
  ["1-14", "비타민C", "비타민C", "비타민c,아스코브산,ascorb,vitaminc,vitc"],
  ["1-15", "칼슘", "칼슘", "칼슘,calcium", "판토텐산,casein"],
  ["1-16", "마그네슘", "마그네슘", "마그네슘,magnesium", "스테아린산,stearate"],
  ["1-17", "철", "철", "철분,제일철,제이철,글루콘산철,리포조말철,iron"],
  ["1-18", "아연", "아연", "아연,zinc"],
  ["1-19", "구리", "구리", "구리,글루콘산동,황산동,copper"],
  ["1-20", "셀레늄", "셀레늄", "셀레늄,셀렌,selen"],
  ["1-21", "요오드", "요오드", "요오드,아이오딘,iodine"],
  ["1-22", "망간", "망간", "망간,mangan"],
  ["1-23", "몰리브덴", "몰리브덴", "몰리브덴,molybden"],
  ["1-24", "칼륨", "칼륨", "칼륨,potassium", "소브산,솔빈산,아세설팜"],
  ["1-25", "크롬", "크롬", "크롬,chromium"],
  ["1-26", "식이섬유", "식이섬유", "식이섬유,dietaryfiber"],
  ["1-27", "단백질", "단백질", "단백질,protein,유청단백,분리대두단백,whey", "가수분해물"],
  ["1-28", "필수지방산", "필수지방산", "필수지방산,리놀레산,리놀렌산", "공액,감마"],
];

const FUNCTIONAL: Seed[] = [
  ["2-1", "인삼", "진세노사이드 Rg1·Rb1·Rg3 합", "인삼,ginseng", "홍삼,흑삼,인삼향,redginseng,전칠삼,notoginseng"],
  ["2-2", "홍삼", "진세노사이드 Rg1·Rb1·Rg3 합", "홍삼,redginseng"],
  ["2-3", "엽록소 함유 식물", "총 엽록소", "엽록소,클로로필,chlorophyll"],
  ["2-4", "클로렐라", "총 엽록소", "클로렐라,chlorella"],
  ["2-5", "스피루리나", "총 엽록소", "스피루리나,spirulina"],
  ["2-6", "녹차추출물", "카테킨", "녹차추출,녹차카테킨,카테킨,catechin"],
  ["2-7", "알로에 전잎", null, "알로에전잎"],
  ["2-8", "프로폴리스추출물", "총 플라보노이드", "프로폴리스,propolis"],
  ["2-9", "코엔자임Q10", "코엔자임Q10", "코엔자임q10,coq10,유비퀴논,유비데카레논,ubiquinone"],
  ["2-10", "대두이소플라본", "대두이소플라본", "이소플라본,isoflavone"],
  ["2-11", "구아바잎 추출물", "총 폴리페놀", "구아바잎,guavaleaf"],
  ["2-12", "바나바잎 추출물", "코로솔산", "바나바,banaba"],
  ["2-13", "은행잎 추출물", "플라보놀 배당체", "은행잎,ginkgo"],
  ["2-14", "밀크씨슬 추출물", "실리마린", "밀크씨슬,밀크시슬,milkthistle,실리마린,silymarin"],
  ["2-15", "달맞이꽃 종자 추출물", null, "달맞이꽃,eveningprimrose"],
  ["2-16", "EPA 및 DHA 함유 유지", "EPA와 DHA의 합", "오메가3,omega3,epa,dha,정제어유,rtg"],
  ["2-17", "감마리놀렌산 함유 유지", "감마리놀렌산", "감마리놀렌산,보라지,borage"],
  ["2-18", "레시틴", null, "레시틴,lecithin"],
  ["2-19", "스쿠알렌", "스쿠알렌", "스쿠알렌,squalene"],
  ["2-20", "식물스테롤/식물스테롤에스테르", "식물스테롤", "식물스테롤,피토스테롤,phytosterol,plantsterol"],
  ["2-21", "알콕시글리세롤 함유 상어간유", "알콕시글리세롤", "알콕시글리세롤,상어간유"],
  ["2-22", "옥타코사놀 함유 유지", "옥타코사놀", "옥타코사놀,octacosanol"],
  ["2-23", "매실추출물", "구연산", "매실추출,매실농축"],
  ["2-24", "공액리놀레산", "공액리놀레산", "공액리놀레산,tonalin"],
  ["2-25", "가르시니아캄보지아 추출물", "총 (-)-HCA", "가르시니아,가르시나아,garcinia"],
  ["2-26", "루테인", "루테인", "루테인,lutein,마리골드"],
  ["2-27", "헤마토코쿠스 추출물", "아스타잔틴", "헤마토코쿠스,아스타잔틴,astaxanthin,astazine"],
  ["2-28", "쏘팔메토 열매 추출물", "로르산", "쏘팔메토,소팔메토,sawpalmetto"],
  ["2-29", "포스파티딜세린", "포스파티딜세린", "포스파티딜세린,phosphatidylserine,biops"],
  ["2-30", "글루코사민", "글루코사민", "글루코사민,glucosamine", "아세틸,acetyl"],
  ["2-31", "N-아세틸글루코사민", "N-아세틸글루코사민", "아세틸글루코사민,acetylglucosamine,글루코사민n아세틸,엔에이지"],
  ["2-32", "뮤코다당·단백", "뮤코다당", "뮤코다당,콘드로이친,chondroitin"],
  ["2-33", "구아검/구아검가수분해물", "식이섬유", "구아검,guargum"],
  ["2-34", "글루코만난(곤약, 곤약만난)", "식이섬유", "글루코만난,곤약,konjac"],
  ["2-35", "귀리식이섬유", "식이섬유", "귀리식이섬유,귀리섬유"],
  ["2-36", "난소화성말토덱스트린", "식이섬유", "난소화성말토덱스트린,난소화성덱스트린,fibersol"],
  ["2-37", "대두식이섬유", "식이섬유", "대두식이섬유,대두섬유"],
  ["2-38", "목이버섯식이섬유", "식이섬유", "목이버섯식이섬유"],
  ["2-39", "밀식이섬유", "식이섬유", "밀식이섬유,밀섬유"],
  ["2-40", "보리식이섬유", "식이섬유", "보리식이섬유,보리섬유"],
  ["2-41", "아라비아검(아카시아검)", "식이섬유", "아라비아검,아카시아검,gumarabic,acaciagum"],
  ["2-42", "옥수수겨식이섬유", "식이섬유", "옥수수겨"],
  ["2-43", "이눌린/치커리추출물", "식이섬유", "이눌린,inulin,치커리"],
  ["2-44", "차전자피식이섬유", "식이섬유", "차전자피,psyllium"],
  ["2-45", "폴리덱스트로스", "식이섬유", "폴리덱스트로스,polydextrose"],
  ["2-46", "호로파종자식이섬유", "식이섬유", "호로파,fenugreek"],
  ["2-47", "알로에 겔", "총 다당체", "알로에겔,알로에베라겔,aloegel,알로에베라", "전잎"],
  ["2-48", "영지버섯 자실체 추출물", "베타글루칸", "영지버섯,영지"],
  ["2-49", "키토산/키토올리고당", "키토산", "키토산,키토올리고당,chitosan"],
  ["2-50", "프락토올리고당", "프락토올리고당", "프락토올리고당,fructooligo"],
  ["2-51", "프로바이오틱스", "생균수", "프로바이오틱스,probiotic,유산균,락토바실,비피도,lactobacill,bifido,lacticaseibacillus,lactiplantibacillus",
    "파라바이오틱스,포스트바이오틱스,사균,유산균발효,유산균배양,열처리,틴달,대사산물,가바"],
  ["2-52", "홍국", "모나콜린K", "홍국,redyeastrice,monascus"],
  ["2-53", "대두단백", "대두단백", "대두단백,soyprotein,supro"],
  ["2-54", "테아닌", "테아닌", "테아닌,theanine"],
  ["2-55", "엠에스엠(MSM)", "MSM", "msm,엠에스엠,메틸설포닐메탄,식이유황"],
  ["2-68", "회화나무열매추출물", null, "회화나무"],
  ["2-69", "콜레우스포스콜리 추출물", "포스콜린", "콜레우스,포스콜리,forskolin"],
  // 공전 번호를 확인하지 못한 고시형 원료 — 화면에서 번호를 채워 넣는다
  [null, "폴리감마글루탐산", null, "폴리감마글루탐산,감마pga"],
  [null, "마늘", null, "마늘,garlic", "마늘향,튀긴,플레이크"],
  [null, "히알루론산", "히알루론산", "히알루론산,hyaluron"],
  [null, "빌베리 추출물", "안토시아노사이드", "빌베리,bilberry"],
  [null, "상황버섯 추출물", null, "상황버섯"],
  [null, "루테인지아잔틴복합추출물", "루테인·지아잔틴", "지아잔틴,zeaxanthin"],
  [null, "분말한천", "식이섬유", "분말한천,한천분말"],
  [null, "라피노스", "라피노스", "라피노스,raffinose"],
];

export const DEFAULT_STANDARDS = [
  ...NUTRIENTS.map((s) => ({ s, group: "영양성분" })),
  ...FUNCTIONAL.map((s) => ({ s, group: "기능성원료" })),
].map(({ s: [code, name, component, keywords, excludes, note], group }, i) => ({
  code, name, component, keywords, excludes: excludes ?? null, note: note ?? null, group, sortOrder: (i + 1) * 10,
}));
