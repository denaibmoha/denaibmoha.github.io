type Props = {
  prompt: string;
  onPrompt: (prompt: string) => void;
  maxTokens: 32 | 64;
  onMaxTokens: (tokens: 32 | 64) => void;
  busy: boolean;
};

const examples = [
  { label: 'Rewrite', prompt: 'Rewrite in simpler words: The implementation requires additional computational resources.' },
  { label: 'Summarize', prompt: 'Summarize in one sentence: A tutor listens to a learner speak. The tutor corrects mistakes and suggests new words.' },
  { label: 'Create', prompt: 'Write two sentences about a robot learning to grow a garden.' },
];

export default function LLMInput({ prompt, onPrompt, maxTokens, onMaxTokens, busy }: Props) {
  return <>
    <p className="lab-description llm-description">A tiny English model for short rewrites and idea starters. Try a prompt and watch its words arrive.</p>
    <div className="llm-examples" role="group" aria-label="Example writing prompts">{examples.map(example => <button key={example.label} onClick={() => onPrompt(example.prompt)} disabled={busy}>{example.label}</button>)}</div>
    <label htmlFor="llm-prompt">Your prompt <span>{prompt.length}/600</span></label>
    <textarea id="llm-prompt" rows={5} maxLength={600} value={prompt} onChange={event => onPrompt(event.target.value)} disabled={busy}/>
    <label htmlFor="llm-length">Response limit</label>
    <select id="llm-length" value={maxTokens} onChange={event => onMaxTokens(Number(event.target.value) as 32 | 64)} disabled={busy}>
      <option value={32}>32 tokens · quick experiment</option>
      <option value={64}>64 tokens · a little more room</option>
    </select>
    <p className="input-tip">One prompt per run. Roughly a few sentences, not a full conversation. Nothing downloads until you press Generate.</p>
  </>;
}
