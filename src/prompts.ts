type PromptTemplate = { id: string; title: string; body: string };

const templates: PromptTemplate[] = [
  {
    id: 'explain',
    title: 'Explain code',
    body: 'Explain what this code does, its key behaviors, and highlight concerns a reviewer should know..'
  },
  {
    id: 'debug',
    title: 'Debug issue',
    body: 'Identify bugs or risky behavior. Point to exact lines and suggest concrete fixes.'
  },
  {
    id: 'Answer',
    title: 'Answer Question',
    body: 'Answer the question ensuring factual accuracy. Think step by step for complex questions. Clearly state your assumptions.'
  }
];

export default templates;
export type { PromptTemplate };

export const slugPrompt =
  'Generate a 3-6 word, lowercase, hyphen-separated slug for this council run. Respond with only the slug text.';
