import React, { useEffect, useRef } from "react";

const exactTranslations = {
  "Today in AfiaCare": "اليوم في عافية كير",
  "Your day, at a glance": "يومك بنظرة سريعة",
  "Focus on the next useful step. Everything else stays out of the way.": "ركز على الخطوة المفيدة التالية. كل شيء آخر يبقى بعيدا عن طريقك.",
  "Score": "النتيجة",
  "Meals": "الوجبات",
  "Move": "الحركة",
  "Next up": "التالي",
  "Only the three actions with the strongest effect today.": "أقوى ثلاث خطوات لهذا اليوم فقط.",
  "Morning and night check-in": "تسجيل الصباح والمساء",
  "Open only when you want to record the day.": "افتحه فقط عندما تريد تسجيل يومك.",
  "Today's details": "تفاصيل اليوم",
  "Mood": "المزاج",
  "Movement": "الحركة",
  "None yet": "لا يوجد بعد",
  "Not logged": "لم يتم التسجيل",
  "Review a meal when it is useful.": "راجع وجبة عندما يكون ذلك مفيدا.",
  "Movement can be logged later.": "يمكن تسجيل الحركة لاحقا.",
  "Add it when your state changes.": "أضفه عندما تتغير حالتك.",
  "Synced with today's guidance.": "متزامن مع إرشادات اليوم.",
  "Log mood": "سجل المزاج",
  "Review meal": "راجع الوجبة",
  "Set reminder": "اضبط تذكيرا",
  "Full dashboard": "لوحة كاملة",

  "Mood check-in": "تسجيل المزاج",
  "How are you feeling today?": "كيف تشعر اليوم؟",
  "Pick a mood. The app saves the check-in, sends a useful nudge, and tracks weekly and monthly patterns.": "اختر مزاجك. يحفظ التطبيق التسجيل، ويرسل خطوة مفيدة، ويتابع الأنماط الأسبوعية والشهرية.",
  "Happy": "سعيد",
  "Anxious": "قلق",
  "Stressed": "متوتر",
  "Tired": "متعب",
  "Sad": "حزين",
  "Motivated": "متحمس",
  "Selected": "محدد",
  "Tap to save": "اضغط للحفظ",
  "Saved check-in": "تم حفظ التسجيل",
  "No mood selected yet": "لم يتم اختيار مزاج بعد",
  "Choose a mood above to save your first local check-in.": "اختر مزاجا أعلاه لحفظ أول تسجيل محلي.",
  "Nudge": "خطوة مقترحة",
  "Waiting for check-in": "بانتظار التسجيل",
  "Select a mood to receive a suggested next step.": "اختر مزاجا للحصول على خطوة تالية مقترحة.",
  "Open suggested tool": "افتح الأداة المقترحة",
  "Mood patterns": "أنماط المزاج",
  "AfiaCare keeps local weekly and monthly patterns so nudges can become smarter over time.": "يحفظ عافية كير الأنماط الأسبوعية والشهرية محليا لتصبح الاقتراحات أذكى بمرور الوقت.",
  "This week": "هذا الأسبوع",
  "This month": "هذا الشهر",
  "Try a breathing meditation": "جرب تأملا تنفسيا",
  "Check in": "سجل الآن",
  "Open Salem": "افتح سالم",
  "Complete tonight's reflection": "أكمل تأمل الليلة",
  "Complete today's check-in": "أكمل تسجيل اليوم",
  "Close the day with mood and recovery context.": "اختتم اليوم بسياق المزاج والتعافي.",
  "Set today's mood, energy, and main priority.": "حدد مزاج اليوم وطاقتك وأولويتك الرئيسية.",
  "Hydration is behind": "شرب الماء متأخر",
  "Add gentle movement": "أضف حركة خفيفة",
  "Review the next meal": "راجع الوجبة التالية",
  "Mood check-in missing": "تسجيل المزاج غير موجود",
  "Protect tonight's sleep": "احم نوم الليلة",
  "Remind me": "ذكرني",
  "Start": "ابدأ",
  "Review": "راجع",
  "Wind down": "اهدأ",

  "Noura AI": "نورة AI",
  "Ask Noura a practical health habit question": "اسأل نورة سؤالا عمليا عن عادات الصحة",
  "Practical wellness education for daily habits, UAE heat and hydration, food, movement, sleep, and SDG 3 reflection.": "تثقيف عملي للعافية حول العادات اليومية وحرارة الإمارات والترطيب والطعام والحركة والنوم والتأمل في الهدف 3.",
  "Noura, Wellness Guide": "نورة، مرشدة العافية",
  "Uses today's meals, movement, mood, score, and UAE daily context when available": "تستخدم وجبات اليوم والحركة والمزاج والنتيجة وسياق الإمارات عند توفرها",
  "Your wellness question": "سؤالك عن العافية",
  "This app does not provide medical diagnosis. For serious symptoms, contact a healthcare professional.": "لا يقدم هذا التطبيق تشخيصا طبيا. عند الأعراض الخطيرة، تواصل مع مختص رعاية صحية.",
  "Hi, I am Noura. Ask me about heat, hydration, food, exercise, sleep, or today's UAE routine. I can use your logged meals and movement when they are available.": "مرحبا، أنا نورة. اسألني عن الحرارة، الترطيب، الطعام، التمارين، النوم، أو روتينك اليومي في الإمارات. أستطيع استخدام وجباتك وحركتك المسجلة عند توفرها.",
  "Preparing response...": "جار تحضير الرد...",
  "Send": "إرسال",

  "Salem AI": "سالم AI",
  "Reflect with Salem and choose a kinder next step": "تأمل مع سالم واختر خطوة ألطف",
  "A supportive reflection space for grounding and emotional well-being. It does not replace professional therapy.": "مساحة داعمة للتأمل والتهدئة والعافية النفسية. لا تستبدل العلاج المهني.",
  "Salem, Reflection Coach": "سالم، مدرب التأمل",
  "Grounding prompts connected to today's logged habits": "أسئلة تهدئة مرتبطة بعادات اليوم المسجلة",
  "What is on your mind?": "ما الذي يشغل بالك؟",
  "Not a crisis service or licensed therapy. For urgent risk, contact emergency services or a trusted adult.": "ليست خدمة أزمات أو علاجا مرخصا. عند الخطر العاجل، تواصل مع الطوارئ أو شخص بالغ موثوق.",
  "Hi, I am Salem. I can help you reflect, calm your breathing, and plan one small next step. I am not a licensed therapist, but I can use today's logged habits to make the support more practical.": "مرحبا، أنا سالم. أستطيع مساعدتك على التأمل وتهدئة تنفسك وتخطيط خطوة صغيرة تالية. لست معالجا مرخصا، لكنني أستطيع استخدام عادات اليوم المسجلة لجعل الدعم أكثر عملية.",
  "Future versions could connect to approved school counselling resources, crisis contacts, and multilingual mental health education.": "يمكن للإصدارات القادمة الاتصال بموارد الإرشاد المدرسي المعتمدة، وجهات دعم الأزمات، وتثقيف الصحة النفسية بلغات متعددة.",

  "Food vision": "رؤية الطعام",
  "Review a meal photo": "راجع صورة وجبة",
  "Upload a dish photo to estimate calories, identify likely foods, understand key nutrients, and connect the meal to your daily plan.": "ارفع صورة طبق لتقدير السعرات، وتحديد الأطعمة المحتملة، وفهم العناصر الغذائية المهمة، وربط الوجبة بخطتك اليومية.",
  "Upload meal photo": "ارفع صورة الوجبة",
  "Choose an image from your device. The preview stays in your browser.": "اختر صورة من جهازك. تبقى المعاينة داخل المتصفح.",
  "Reviewing meal...": "جار مراجعة الوجبة...",
  "Run vision review": "تشغيل مراجعة الرؤية",
  "Nutrition review": "مراجعة التغذية",
  "No meal photo yet": "لا توجد صورة وجبة بعد",
  "Educational estimate only. Use it as a planning aid, not a medical nutrition label.": "تقدير تعليمي فقط. استخدمه كأداة تخطيط، وليس كملصق تغذية طبي.",
  "Upload a picture to see likely foods, calories, nutrients, and balance suggestions.": "ارفع صورة لرؤية الأطعمة المحتملة والسعرات والعناصر الغذائية واقتراحات التوازن.",
  "Estimated kcal": "السعرات المقدرة",
  "Balance": "التوازن",
  "Protein": "البروتين",
  "estimated from visible foods": "مقدر من الأطعمة الظاهرة",
  "Likely foods detected": "الأطعمة المحتملة المكتشفة",
  "Quick balance moves": "خطوات سريعة للتوازن",
  "Correct foods if SmolVLM missed something": "صحح الأطعمة إذا فات SmolVLM شيء",
  "Update nutrition from corrected foods": "حدث التغذية من الأطعمة المصححة",
  "Nutrients this meal may provide": "عناصر غذائية قد توفرها هذه الوجبة",
  "The local model did not identify nutrient details for this photo.": "لم يحدد النموذج المحلي تفاصيل العناصر الغذائية لهذه الصورة.",
  "Nutrients are enriched from AfiaCare's local food knowledge layer after SmolVLM identifies likely foods.": "يتم إثراء العناصر الغذائية من طبقة معرفة الطعام المحلية في عافية كير بعد أن يحدد SmolVLM الأطعمة المحتملة.",
  "Body functions": "وظائف الجسم",
  "Movement link": "صلة الحركة",
  "Dashboard link": "صلة لوحة المتابعة",
  "How this connects with the rest of today": "كيف يرتبط هذا ببقية اليوم",
  "Add this review to today's food log": "أضف هذه المراجعة إلى سجل طعام اليوم",
  "Add food review to logs": "أضف مراجعة الطعام إلى السجلات",
  "AfiaCare only counts this meal after you add it here.": "لا يحسب عافية كير هذه الوجبة إلا بعد إضافتها هنا.",
  "Image analysis uses your local SmolVLM model through LM Studio when it is running. Estimates are educational and should not replace a dietitian or doctor.": "يستخدم تحليل الصور نموذج SmolVLM المحلي عبر LM Studio عند تشغيله. التقديرات تعليمية ولا تستبدل أخصائي تغذية أو طبيبا.",
  "Calories by food": "السعرات حسب الطعام",
  "Nutrients gained": "العناصر الغذائية المكتسبة",
  "Estimated from the corrected food list and visible ingredients.": "مقدر من قائمة الأطعمة المصححة والمكونات الظاهرة.",
  "No clear items identified.": "لم يتم تحديد عناصر واضحة.",
  "Not available yet.": "غير متاح بعد.",
  "Breakfast": "الإفطار",
  "Lunch": "الغداء",
  "Dinner": "العشاء",
  "Snack": "وجبة خفيفة",

  "Food log": "سجل الطعام",
  "Review today's meals": "راجع وجبات اليوم",
  "Use the food log to see meals saved from Food Vision and how they support your day.": "استخدم سجل الطعام لرؤية الوجبات المحفوظة من رؤية الطعام وكيف تدعم يومك.",
  "No meals logged yet": "لم تسجل أي وجبات بعد",
  "Open Food Vision": "افتح رؤية الطعام",

  "Yoga assistance": "مساعدة اليوغا",
  "Choose a gentle yoga flow": "اختر تسلسل يوغا لطيفا",
  "Simple, beginner-friendly yoga plans for calm, energy, and sleep. Move slowly and stop if something hurts.": "خطط يوغا بسيطة ومناسبة للمبتدئين للهدوء والطاقة والنوم. تحرك ببطء وتوقف إذا شعرت بألم.",
  "Today's intention": "نية اليوم",
  "Calm stress": "تهدئة التوتر",
  "Morning energy": "طاقة الصباح",
  "Better sleep": "نوم أفضل",
  "Minutes completed": "الدقائق المكتملة",
  "Generate yoga flow": "إنشاء تسلسل يوغا",
  "Preparing flow...": "جار تجهيز التسلسل...",
  "Log completed flow": "سجل التسلسل المكتمل",
  "Logged to SDG activity": "تم تسجيله في نشاط الهدف",
  "Calm Reset Flow": "تسلسل تهدئة وإعادة ضبط",
  "Morning Energy Flow": "تسلسل طاقة الصباح",
  "Sleep Wind-down Flow": "تسلسل تهدئة للنوم",
  "Stress relief and nervous system calm": "تخفيف التوتر وتهدئة الجهاز العصبي",
  "Gentle energy before school or work": "طاقة خفيفة قبل المدرسة أو العمل",
  "Preparing the body for rest": "تهيئة الجسم للراحة",
  "Box breathing": "تنفس الصندوق",
  "Seated neck release": "إرخاء الرقبة جلوسا",
  "Child pose": "وضعية الطفل",
  "Cat-cow": "القطة والبقرة",
  "Legs up the wall": "رفع الساقين على الحائط",
  "Deep breathing": "تنفس عميق",
  "Standing side stretch": "تمدد جانبي واقفا",
  "Sun salutation": "تحية الشمس",
  "Low lunge": "اندفاع منخفض",
  "Forward fold": "انحناء أمامي",
  "Slow breathing": "تنفس بطيء",
  "Butterfly pose": "وضعية الفراشة",
  "Seated forward fold": "انحناء أمامي جلوسا",
  "Supine twist": "التواء مستلق",
  "Stillness": "سكون",
  "Tip: use this after prayer, before sleep, or during a study break. Yoga should feel steady, not painful.": "نصيحة: استخدمه بعد الصلاة، قبل النوم، أو أثناء استراحة الدراسة. يجب أن تكون اليوغا ثابتة لا مؤلمة.",

  "Exercise": "التمارين",
  "Exercise assistant": "مساعد التمارين",
  "Build a safer movement plan": "ابن خطة حركة أكثر أمانا",
  "Live posture correction": "تصحيح الوضعية المباشر",
  "Camera stays on this device. Use a clear side view and stop if anything hurts.": "تبقى الكاميرا على هذا الجهاز. استخدم زاوية جانبية واضحة وتوقف إذا شعرت بألم.",

  "Reminders": "التذكيرات",
  "Build a simple care rhythm": "ابن إيقاع رعاية بسيطا",
  "Add reminder": "أضف تذكيرا",
  "Reminder type": "نوع التذكير",
  "Time": "الوقت",
  "Add to reminders": "أضف إلى التذكيرات",
  "Today's reminders": "تذكيرات اليوم",
  "Done": "تم",
  "Mark done": "ضع علامة تم",
  "Reset": "إعادة ضبط",
  "Water": "ماء",
  "Medication": "دواء",
  "Movement break": "استراحة حركة",

  "UAE Daily Tips": "نصائح الإمارات اليومية",
  "Daily tips for UAE routines": "نصائح يومية لروتين الإمارات",
  "Next tip": "النصيحة التالية",
  "Try this": "جرب هذا",
  "Save as reminder": "احفظ كتذكير",

  "Family Challenges": "تحديات العائلة",
  "Choose a shared wellness challenge": "اختر تحديا عائليا مشتركا للعافية",
  "How challenges connect": "كيف ترتبط التحديات",
  "Join challenge": "انضم للتحدي",
  "Complete": "أكمل",
  "Completed": "مكتمل",

  "Community": "المجتمع",
  "AfiaCare Community": "مجتمع عافية كير",
  "Build healthier routines together": "ابنوا روتينا صحيا معا",
  "Challenges": "التحديات",
  "Discussions": "النقاشات",
  "Upcoming meetups": "لقاءات قادمة",
  "Small habits, shared momentum.": "عادات صغيرة وزخم مشترك.",
  "Ask, share, and encourage.": "اسأل وشارك وشجع.",
  "Public venues, moderated plans.": "أماكن عامة وخطط بإشراف.",
  "Create": "إنشاء",
  "New post": "منشور جديد",
  "Moderator queue": "قائمة الإشراف",
  "No open reports.": "لا توجد بلاغات مفتوحة.",
  "Dismiss": "تجاهل",
  "Hide": "إخفاء",

  "UAE Resources": "موارد الإمارات",
  "Trusted UAE support resources": "موارد دعم موثوقة في الإمارات",
  "Save emergency and wellbeing contacts before you need them.": "احفظ جهات الطوارئ والعافية قبل أن تحتاجها.",

  "SDG 3 + Environment": "الهدف 3 والبيئة",
  "Your SDG 3 wellness dashboard": "لوحة عافيتك للهدف 3",
  "Three simple fixes for today": "ثلاثة إصلاحات بسيطة لليوم",
  "Today's snapshot": "لمحة اليوم",
  "Priority trackers": "متتبعات الأولوية",
  "What updated your score?": "ما الذي حدث نتيجتك؟",
  "Patterns and daily log": "الأنماط والسجل اليومي",
};

const phraseTranslations = [
  [/^(\d+) priorities$/, "$1 أولويات"],
  [/^(\d+) saved check-ins$/, "$1 تسجيلات محفوظة"],
  [/^Anxious or stressed check-ins: (\d+)\. Total check-ins: (\d+)\.$/, "تسجيلات القلق أو التوتر: $1. إجمالي التسجيلات: $2."],
  [/^Today: (.*) Movement: (.*)$/, "اليوم: $1 الحركة: $2"],
  [/^Context active: mood is (.*); movement is (.*)$/, "السياق نشط: المزاج $1؛ الحركة $2"],
  [/^Source: (.*)$/, "المصدر: $1"],
  [/^Helps with (.*)$/, "يساعد في $1"],
  [/^From (.*)$/, "من $1"],
  [/^Reasoning: (.*)\.$/, "الاستدلال: $1."],
  [/^(\d+) kcal total$/, "المجموع $1 سعرة"],
  [/^(\d+) kcal$/, "$1 سعرة"],
  [/^(\d+) minutes$/, "$1 دقائق"],
  [/^(\d+) reviewed$/, "$1 تمت مراجعتها"],
  [/^Added to (.*)$/, "تمت الإضافة إلى $1"],
  [/^(\d+) reminders, (\d+) meals, (\d+) movement sessions\.$/, "$1 تذكيرات، $2 وجبات، $3 جلسات حركة."],
  [/^(\d+) of (\d+) glasses logged today\.$/, "تم تسجيل $1 من $2 أكواب اليوم."],
  [/^(\d+) of (\d+) active minutes logged\.$/, "تم تسجيل $1 من $2 دقيقة نشطة."],
  [/^(\d+) of (\d+) balanced meals logged\.$/, "تم تسجيل $1 من $2 وجبات متوازنة."],
  [/^(\d+) of (\d+) hours logged\.$/, "تم تسجيل $1 من $2 ساعات."],
];

const placeholderTranslations = {
  "Example: What should I do after what I ate today?": "مثال: ماذا أفعل بعد ما أكلته اليوم؟",
  "Example: I feel stressed and want a small next step.": "مثال: أشعر بالتوتر وأريد خطوة صغيرة تالية.",
  "Example: rice, grilled chicken, cucumber salad": "مثال: أرز، دجاج مشوي، سلطة خيار",
};

const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG"]);

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function translateText(text) {
  const normalized = normalize(text);
  if (!normalized) return text;
  if (exactTranslations[normalized]) return text.replace(normalized, exactTranslations[normalized]);

  for (const [pattern, replacement] of phraseTranslations) {
    if (pattern.test(normalized)) {
      return text.replace(normalized, normalized.replace(pattern, replacement));
    }
  }

  return text;
}

function translateElement(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!normalize(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const translated = translateText(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  });

  root.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((field) => {
    const placeholder = field.getAttribute("placeholder");
    const translated = placeholderTranslations[placeholder] || translateText(placeholder);
    if (translated && translated !== placeholder) field.setAttribute("placeholder", translated);
  });

  root.querySelectorAll("img[alt], button[aria-label], [title]").forEach((element) => {
    ["alt", "aria-label", "title"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      const translated = translateText(value);
      if (translated !== value) element.setAttribute(attribute, translated);
    });
  });
}

export default function ArabicPageTranslator({ enabled, children }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return undefined;

    let frame = 0;
    const scheduleTranslation = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => translateElement(root));
    };

    scheduleTranslation();
    const observer = new MutationObserver(scheduleTranslation);
    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["placeholder", "alt", "aria-label", "title"],
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled]);

  return (
    <div ref={rootRef} className="app-translated-page">
      {children}
    </div>
  );
}
