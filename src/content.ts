// Edit portfolio content here. Keep private or unverified work clearly labelled.
export const profile = {
  name: 'Mahmoud Denaib',
  email: 'denaibmahmoud@gmail.com',
  github: 'https://github.com/denaibmoha',
  linkedin: 'https://www.linkedin.com/in/mahmouddenaib04',
  location: 'Kraków, Poland',
  portrait: `${import.meta.env.BASE_URL}mahmoud-denaib.jpg`,
  resume: `${import.meta.env.BASE_URL}Mahmoud-Denaib-CV.pdf`,
};

export const expertise = [
  { number: '01', title: 'Language & LLMs', text: 'Dialogue generation, grammatical error correction, and feedback quality.', tools: 'LLMs · NLP · GecToR' },
  { number: '02', title: 'Context & memory', text: 'Exploring how embeddings and retrieval give a conversation useful context.', tools: 'Vector embeddings · LangGraph · AutoGen' },
  { number: '03', title: 'Voice & evaluation', text: 'Comparing speech tools through quality, response time, and operating cost.', tools: 'Speech-to-text · Text-to-speech · ElevenLabs' },
];

export const project = {
  title: 'A conversation. A little more confidence.',
  description: 'Exploring an AI avatar that helps people practise speaking a language through natural conversation, with useful feedback along the way.',
  role: 'AI/ML Engineer · Part-time',
  organization: 'Stealth AI startup',
  period: 'Mar 2026 — present',
  tags: ['LLMs', 'Contextual retrieval', 'Voice AI'],
  details: [
    { label: '01 / DIALOGUE', title: 'Keep the conversation going.', text: 'Exploring LLM dialogue generation and GecToR for grammatical error correction. The goal is feedback that supports speaking practice.' },
    { label: '02 / CONTEXT', title: 'Give the next reply context.', text: 'Evaluating vector embeddings for contextual retrieval and conversational memory, so past exchanges can inform the next response.' },
    { label: '03 / EVALUATION', title: 'Make the trade-offs explicit.', text: 'Comparing ElevenLabs with local speech models and defining criteria for feedback quality, response latency, and operating cost.' },
  ],
};

export const journey = [
  { period: '2026 — NOW', title: 'Computer Science', place: 'WSB University, Poland', detail: 'Security & Continuity of IT specialization' },
  { period: '2025 — 2026', title: 'Understanding customers', place: 'Retail sales · Med’s Building Materials', detail: 'French & Arabic customer communication' },
  { period: '2023 — 2024', title: 'Connecting the details', place: 'Support & accounting · Mentouri Construction', detail: 'Invoices, spreadsheets & business workflows' },
];

export const modes = [
  { name: 'Language', label: '01 / LANGUAGE', caption: ['From scattered signals', 'to meaningful connections.'] },
  { name: 'Memory', label: '02 / MEMORY', caption: ['Every connection', 'adds another layer.'] },
  { name: 'Voice', label: '03 / VOICE', caption: ['An idea becomes a signal.', 'A signal becomes a voice.'] },
] as const;
