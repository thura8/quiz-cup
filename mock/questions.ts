import type { QuizCupCategoryId, QuizCupDifficultyId } from "@/types/quiz-cup";

export type MockQuestion = {
  id: string;
  category: QuizCupCategoryId;
  difficulty: QuizCupDifficultyId;
  question: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
};

export const MOCK_QUESTIONS: MockQuestion[] = [
  { id: "gen-1", category: "general", difficulty: "easy", question: "ประเทศไทยมีกี่จังหวัด (รวมกรุงเทพมหานคร)", choices: ["76", "77", "78", "75"], answer: 1 },
  { id: "gen-2", category: "general", difficulty: "easy", question: "ธงชาติไทยมีทั้งหมดกี่สี", choices: ["2 สี", "3 สี", "4 สี", "5 สี"], answer: 1 },
  { id: "gen-3", category: "general", difficulty: "medium", question: "สกุลเงินของประเทศญี่ปุ่นคืออะไร", choices: ["วอน", "หยวน", "เยน", "ริงกิต"], answer: 2 },
  { id: "gen-4", category: "general", difficulty: "hard", question: "เมืองหลวงของประเทศออสเตรเลียคือเมืองใด", choices: ["ซิดนีย์", "เมลเบิร์น", "แคนเบอร์รา", "เพิร์ท"], answer: 2 },

  { id: "sci-1", category: "science", difficulty: "easy", question: "สูตรเคมีของน้ำคือข้อใด", choices: ["CO₂", "H₂O", "O₂", "NaCl"], answer: 1 },
  { id: "sci-2", category: "science", difficulty: "easy", question: "อวัยวะใดทำหน้าที่สูบฉีดเลือดไปทั่วร่างกาย", choices: ["ปอด", "ตับ", "หัวใจ", "ไต"], answer: 2 },
  { id: "sci-3", category: "science", difficulty: "medium", question: "ดาวเคราะห์ดวงใดอยู่ใกล้ดวงอาทิตย์ที่สุด", choices: ["ดาวศุกร์", "ดาวอังคาร", "ดาวพุธ", "โลก"], answer: 2 },
  { id: "sci-4", category: "science", difficulty: "medium", question: "ก๊าซใดมีปริมาณมากที่สุดในอากาศ", choices: ["ออกซิเจน", "ไนโตรเจน", "คาร์บอนไดออกไซด์", "อาร์กอน"], answer: 1 },
  { id: "sci-5", category: "science", difficulty: "hard", question: "หน่วย SI ของแรงคืออะไร", choices: ["จูล", "วัตต์", "นิวตัน", "ปาสคาล"], answer: 2 },

  { id: "math-1", category: "math", difficulty: "easy", question: "7 × 8 เท่ากับเท่าไร", choices: ["54", "56", "63", "48"], answer: 1 },
  { id: "math-2", category: "math", difficulty: "medium", question: "รากที่สองของ 144 คือข้อใด", choices: ["11", "12", "13", "14"], answer: 1 },
  { id: "math-3", category: "math", difficulty: "medium", question: "15% ของ 200 เท่ากับเท่าไร", choices: ["15", "20", "30", "35"], answer: 2 },
  { id: "math-4", category: "math", difficulty: "hard", question: "ผลบวกของมุมภายในรูปหกเหลี่ยมเท่ากับกี่องศา", choices: ["540°", "720°", "900°", "1080°"], answer: 1 },

  { id: "thai-1", category: "thai", difficulty: "easy", question: "พยัญชนะไทยมีทั้งหมดกี่ตัว", choices: ["42 ตัว", "44 ตัว", "46 ตัว", "48 ตัว"], answer: 1 },
  { id: "thai-2", category: "thai", difficulty: "medium", question: "คำใดสะกดถูกต้อง", choices: ["กะทันหัน", "กระทันหัน", "กะทันหั่น", "กระทันหั่น"], answer: 0 },
  { id: "thai-3", category: "thai", difficulty: "medium", question: "คำราชาศัพท์ของคำว่า “กิน” สำหรับพระมหากษัตริย์คือข้อใด", choices: ["เสวย", "ฉัน", "รับประทาน", "บริโภค"], answer: 0 },
  { id: "thai-4", category: "thai", difficulty: "hard", question: "สระในภาษาไทยมีกี่รูป", choices: ["18 รูป", "21 รูป", "24 รูป", "32 รูป"], answer: 1 },

  { id: "eng-1", category: "english", difficulty: "easy", question: "พหูพจน์ของคำว่า child คือข้อใด", choices: ["childs", "children", "childes", "childrens"], answer: 1 },
  { id: "eng-2", category: "english", difficulty: "easy", question: "คำตรงข้ามของ “hot” คือข้อใด", choices: ["warm", "cold", "cool", "heat"], answer: 1 },
  { id: "eng-3", category: "english", difficulty: "medium", question: "รูปอดีต (past tense) ของ “go” คือข้อใด", choices: ["goed", "gone", "went", "going"], answer: 2 },
  { id: "eng-4", category: "english", difficulty: "hard", question: "“benevolent” มีความหมายตรงกับข้อใด", choices: ["โหดร้าย", "มีเมตตา", "ขี้อาย", "ขี้เกียจ"], answer: 1 },

  { id: "his-1", category: "history", difficulty: "easy", question: "ผู้ทรงประดิษฐ์ลายสือไทยคือใคร", choices: ["พ่อขุนศรีอินทราทิตย์", "พ่อขุนรามคำแหงมหาราช", "สมเด็จพระเจ้าตากสินมหาราช", "สมเด็จพระนเรศวรมหาราช"], answer: 1 },
  { id: "his-2", category: "history", difficulty: "medium", question: "กรุงเทพฯ ได้รับการสถาปนาเป็นราชธานีในปี พ.ศ. ใด", choices: ["2310", "2325", "2350", "2475"], answer: 1 },
  { id: "his-3", category: "history", difficulty: "medium", question: "สงครามโลกครั้งที่ 2 สิ้นสุดลงในปี ค.ศ. ใด", choices: ["1918", "1939", "1945", "1950"], answer: 2 },
  { id: "his-4", category: "history", difficulty: "hard", question: "กำแพงเบอร์ลินถูกทลายลงในปี ค.ศ. ใด", choices: ["1979", "1985", "1989", "1991"], answer: 2 },

  { id: "tech-1", category: "technology", difficulty: "easy", question: "CPU ย่อมาจากอะไร", choices: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Power Unit"], answer: 0 },
  { id: "tech-2", category: "technology", difficulty: "medium", question: "HTML ย่อมาจากอะไร", choices: ["HighText Machine Language", "HyperText Markup Language", "HyperTool Multi Language", "Home Text Markup Language"], answer: 1 },
  { id: "tech-3", category: "technology", difficulty: "medium", question: "โปรโตคอลใดใช้รับส่งหน้าเว็บแบบเข้ารหัส", choices: ["FTP", "HTTP", "HTTPS", "SMTP"], answer: 2 },
  { id: "tech-4", category: "technology", difficulty: "hard", question: "ภาษา Java ถูกพัฒนาขึ้นครั้งแรกโดยบริษัทใด", choices: ["Microsoft", "Sun Microsystems", "IBM", "Apple"], answer: 1 },

  { id: "art-1", category: "arts", difficulty: "easy", question: "ใครเป็นผู้วาดภาพโมนาลิซา", choices: ["ปาโบล ปีกัสโซ", "วินเซนต์ แวน โก๊ะ", "เลโอนาร์โด ดา วินชี", "มีเกลันเจโล"], answer: 2 },
  { id: "art-2", category: "arts", difficulty: "medium", question: "การแสดงโขนนิยมแสดงเรื่องใด", choices: ["ขุนช้างขุนแผน", "รามเกียรติ์", "พระอภัยมณี", "อิเหนา"], answer: 1 },
  { id: "art-3", category: "arts", difficulty: "medium", question: "สุนทรภู่เป็นผู้ประพันธ์วรรณคดีเรื่องใด", choices: ["รามเกียรติ์", "พระอภัยมณี", "ขุนช้างขุนแผน", "สามก๊ก"], answer: 1 },
  { id: "art-4", category: "arts", difficulty: "hard", question: "เครื่องดนตรีไทยชนิดใดเป็น “เครื่องสี”", choices: ["ระนาดเอก", "ซออู้", "จะเข้", "ขลุ่ย"], answer: 1 },

  { id: "spo-1", category: "sports", difficulty: "easy", question: "ฟุตบอลส่งผู้เล่นลงสนามได้ทีมละกี่คน", choices: ["9 คน", "10 คน", "11 คน", "12 คน"], answer: 2 },
  { id: "spo-2", category: "sports", difficulty: "easy", question: "กีฬาโอลิมปิกฤดูร้อนจัดขึ้นทุกกี่ปี", choices: ["2 ปี", "3 ปี", "4 ปี", "5 ปี"], answer: 2 },
  { id: "spo-3", category: "sports", difficulty: "medium", question: "มวยไทยได้ชื่อว่าเป็น “ศิลปะแห่งกี่อาวุธ”", choices: ["4 อาวุธ", "6 อาวุธ", "8 อาวุธ", "10 อาวุธ"], answer: 2 },
  { id: "spo-4", category: "sports", difficulty: "medium", question: "แบดมินตันระบบปัจจุบันเล่นเกมละกี่แต้ม", choices: ["11", "15", "21", "25"], answer: 2 },
  { id: "spo-5", category: "sports", difficulty: "hard", question: "เทนนิสแกรนด์สแลมรายการใดแข่งบนคอร์ตดิน", choices: ["วิมเบิลดัน", "ยูเอสโอเพ่น", "ออสเตรเลียนโอเพ่น", "เฟรนช์โอเพ่น"], answer: 3 },

  { id: "env-1", category: "environment", difficulty: "easy", question: "ข้อใดเป็นพลังงานหมุนเวียน", choices: ["ถ่านหิน", "น้ำมัน", "พลังงานแสงอาทิตย์", "ก๊าซธรรมชาติ"], answer: 2 },
  { id: "env-2", category: "environment", difficulty: "medium", question: "ก๊าซเรือนกระจกที่มนุษย์ปล่อยออกมามากที่สุดคือข้อใด", choices: ["คาร์บอนไดออกไซด์", "ออกซิเจน", "ไนโตรเจน", "ฮีเลียม"], answer: 0 },
  { id: "env-3", category: "environment", difficulty: "medium", question: "ฝุ่น PM2.5 คือฝุ่นที่มีขนาดไม่เกินกี่ไมครอน", choices: ["0.25", "2.5", "10", "25"], answer: 1 },
  { id: "env-4", category: "environment", difficulty: "hard", question: "พืชชนิดใดพบมากในป่าชายเลน", choices: ["สัก", "โกงกาง", "ยางนา", "ประดู่"], answer: 1 },

  { id: "car-1", category: "career", difficulty: "easy", question: "ผู้ที่ทำหน้าที่ดูแลรักษาฟันเรียกว่าอะไร", choices: ["สัตวแพทย์", "ทันตแพทย์", "เภสัชกร", "พยาบาล"], answer: 1 },
  { id: "car-2", category: "career", difficulty: "easy", question: "ซื้อของ 250 บาท จ่ายแบงก์ 1,000 บาท ได้เงินทอนเท่าไร", choices: ["650 บาท", "750 บาท", "850 บาท", "700 บาท"], answer: 1 },
  { id: "car-3", category: "career", difficulty: "medium", question: "ผู้ออกแบบอาคารและที่อยู่อาศัยเรียกว่าอะไร", choices: ["วิศวกรโยธา", "สถาปนิก", "มัณฑนากร", "ผู้รับเหมา"], answer: 1 },
  { id: "car-4", category: "career", difficulty: "hard", question: "ฝากเงิน 1,000 บาท ดอกเบี้ยทบต้น 10% ต่อปี ครบ 2 ปีจะมีเงินรวมเท่าไร", choices: ["1,200 บาท", "1,210 บาท", "1,100 บาท", "1,221 บาท"], answer: 1 },

  { id: "log-1", category: "logic", difficulty: "easy", question: "2, 4, 8, 16, … ตัวถัดไปคือเท่าไร", choices: ["24", "30", "32", "64"], answer: 2 },
  { id: "log-2", category: "logic", difficulty: "medium", question: "ถ้าวันนี้เป็นวันจันทร์ อีก 10 วันจะเป็นวันอะไร", choices: ["วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันอังคาร"], answer: 1 },
  { id: "log-3", category: "logic", difficulty: "medium", question: "1, 1, 2, 3, 5, 8, … ตัวถัดไปคือเท่าไร", choices: ["11", "12", "13", "15"], answer: 2 },
  { id: "log-4", category: "logic", difficulty: "hard", question: "เวลา 3:15 น. เข็มยาวกับเข็มสั้นทำมุมกันกี่องศา", choices: ["0°", "7.5°", "15°", "30°"], answer: 1 },
];
