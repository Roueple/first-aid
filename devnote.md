 want to work on DocAI now, so rn what have worked when i test manually is just the API LLM connection. Period. 



What I want next is simple query (minimal LLM intervention)



- **Filter Mode**: Query-focused

  - User inputs their needs

  - AI checks database structure, matches with user input (LLM API)

  - Confirms interpretation with user (Local)

  - Creates (LLM API) and executes Firebase query (Local)

  - Shows results (max 10 in chat) + downloadable XLSX (Local)



**DO**:

- ✅ Always use year as string: `"2024"`, not `2024`

- ✅ Always join with departments table for department filters



Create totally new core logic with available knowledge, dont use existing. Keep existing but not used

can you check why the session title in the DocAI UI still not reflected in the app? not just older, even new i create and new chat again, its not reflected the title. Please check I need this to be reflected directly fo the first chat, just like claude, gemini, other LLM

Things:
- audit-result table values are kinda raw

Current solution (?)
- department table with proper generalization

Concerns:
- is this reliable enough for query? especially for firebase query and is it easy for LLM API to understand and create relevant queries?
- I dont want project name column to be sent to LLM API, how could we manage this? should we delete totally project name column from the audit-result table, and rely from inisial then mapped to project locally later for the result?

