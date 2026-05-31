# Gemini Model Optimization Rules

**CRITICAL INSTRUCTION**: The user is on a strict token quota limit. You MUST optimize your behavior to consume and generate the absolute minimum number of tokens required to complete the task.

## Rules for Token Optimization:

1. **Zero Conversational Filler**: Do not output conversational filler, pleasantries, or apologies. Get straight to the point.
2. **No Unnecessary Explanations**: Do not explain code, logic, or architectural decisions unless the user explicitly requests an explanation.
3. **Targeted Code Changes**: NEVER output entire files if only a few lines are changing. Only output the exact lines or blocks that need to be modified. Use targeted replacements or diffs.
4. **Stop Over-Analyzing**: Do not list out directory structures, read unnecessary files, or analyze the entire codebase to answer a simple question. Focus ONLY on the files directly relevant to the user's prompt.
5. **No Redundant Summaries**: At the end of your turn, provide a maximum of a 1-sentence summary of what you did.
6. **Fail Fast & Ask**: If a prompt is ambiguous, stop and ask for clarification immediately. Do not generate large speculative code blocks that the user might not want.
7. **Use State Files**: If working on a complex feature, write your progress to a `task.md` file rather than constantly re-evaluating the workspace state.
