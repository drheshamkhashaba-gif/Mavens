export const intakeOptions = {
 residence: ["مقيم في الأردن / Jordan resident", "زائر / Visitor", "غير معروف / Unknown"],
 city: ["عمّان / Amman", "إربد / Irbid", "الزرقاء / Zarqa", "العقبة / Aqaba", "السلط / Salt", "مادبا / Madaba", "جرش / Jerash", "عجلون / Ajloun", "المفرق / Mafraq", "الكرك / Karak", "الطفيلة / Tafilah", "معان / Maan", "أخرى / Other", "غير معروف / Unknown"],
 travel: ["نعم / Yes", "لا / No", "غير محدد / Undecided"],
 goal: ["حب الشباب فقط / Acne only", "حب الشباب وآثاره / Acne and sequelae", "يحتاج تقييم الطبيب / Physician assessment needed"],
 effects: ["تصبغات / Pigmentation", "احمرار / Redness", "حفر وندبات / Scarring", "غير متأكد / Unsure"],
 medications: ["نعم / Yes", "لا / No", "غير متأكد / Unsure"],
 medicationTypes: ["إيزوتريتينوين / Isotretinoin", "مضاد حيوي فموي / Oral antibiotic", "مضاد حيوي موضعي / Topical antibiotic", "ريتينويد موضعي / Topical retinoid", "بنزويل بيروكسيد / Benzoyl peroxide", "حمض الأزيليك / Azelaic acid", "علاج هرموني / Hormonal treatment", "دواء آخر — مراجعة الطبيب / Other — physician clarification", "غير معروف / Unknown"],
 duration: ["أقل من شهر / Under one month", "١–٣ أشهر / 1–3 months", "٣–٦ أشهر / 3–6 months", "أكثر من ٦ أشهر / Over 6 months", "غير معروف / Unknown"],
 dose: ["مرة يوميًا / Once daily", "مرتين يوميًا / Twice daily", "حسب الحاجة / As needed", "جدول آخر — مراجعة الطبيب / Other schedule — physician clarification", "غير معروف / Unknown"],
 otherTreatments: ["نعم / Yes", "لا / No", "غير متأكد / Unsure"],
 treatmentTypes: ["ليزر / Laser", "تقشير / Peeling", "ميكرونيدلينغ / Microneedling", "علاج ضوئي / Light therapy", "علاج موضعي / Topical treatment", "أخرى — مراجعة الطبيب / Other — physician clarification", "غير معروف / Unknown"],
 lastTreatment: ["خلال أسبوع / Within a week", "خلال شهر / Within a month", "من شهر إلى ٣ أشهر / 1–3 months ago", "أكثر من ٣ أشهر / Over 3 months ago", "لا يتذكر / Cannot recall"],
};
export const viewTypes=["أمامية / Front", "يمين / Right", "يسار / Left", "إضاءة مستقطبة / Polarized", "UV", "أخرى / Other"];
export type IntakeData = Record<string, string | string[]>;
export function validateIntake(data: IntakeData) {
 if (!data || typeof data !== "object" || Array.isArray(data)) return false;
 const personal=["email","birthDate","travelDay","travelMonth","travelYear","consent"];
 for (const [key,value] of Object.entries(data)) {
  if (key in intakeOptions) {
   const options=intakeOptions[key as keyof typeof intakeOptions] as readonly string[];
   const multi=["effects","medicationTypes","treatmentTypes"].includes(key);
   if(multi!==Array.isArray(value))return false;
   const values=Array.isArray(value)?value:[value];
   if(values.length>20||values.some(v=>v!==""&&!options.includes(v))) return false;
  } else if (!personal.includes(key) || typeof value!=="string" || value.length>254) return false;
 }
 if(data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email)))return false;
 for(const key of ["birthDate"]){if(data[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(String(data[key]))||!Number.isFinite(Date.parse(String(data[key])))||String(data[key])>new Date().toISOString().slice(0,10)))return false;}
 if(data.birthDate && new Date(String(data.birthDate)).toISOString().slice(0,10)!==data.birthDate)return false;
 if(data.consent && !["yes","no"].includes(String(data.consent)))return false;
 for(const [key,min,max] of [["travelDay",1,31],["travelMonth",1,12],["travelYear",2020,2100]] as const){if(data[key]&&(!/^\d+$/.test(String(data[key]))||Number(data[key])<min||Number(data[key])>max))return false;}
 if(data.travelDay&&data.travelMonth&&data.travelYear){const date=new Date(Date.UTC(Number(data.travelYear),Number(data.travelMonth)-1,Number(data.travelDay)));if(date.getUTCDate()!==Number(data.travelDay)||date.getUTCMonth()!==Number(data.travelMonth)-1)return false;}
 return true;
}
