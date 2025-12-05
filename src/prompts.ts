type PromptTemplate = { id: string; title: string; body: string };

const templates: PromptTemplate[] = [
  {
    id: 'explain',
    title: 'Explain code',
    body: 'Explain what this code does and its key behaviors.'
  },
  {
    id: 'debug',
    title: 'Debug issue',
    body: 'Identify bugs or risky behavior. Point to exact lines and suggest concrete fixes.'
  },
  {
    id: 'review',
    title: 'Review code',
    body: 'Review this code for correctness, safety, performance, and readability. List findings with file/line and fixes.'
  },
  {
    id: 'summarize',
    title: 'Summarize',
    body: 'Summarize this code and highlight concerns a reviewer should know.'
  }
];

export default templates;
export type { PromptTemplate };
