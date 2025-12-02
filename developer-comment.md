Okay, so this is an findings search history application, basically.

I need 2 PRIMARY usage for user here:
1. Auto search: AI powered chatbot that can help user ask and/or search anything about prior findings.
2. Manual search: User can search for prior findings by using keywords, filters, etc in the findings table list themselves.

Manual search: we all know the drill, detailed filters, search bar, etc, etc etc, such as normal filter in excel or any professional documents.

Auto search: now this is where I need the AI chatbot to be optimized. For example:
- User asks: "Is there any findings about APAR (fire) in 2024 in hotel?

- AI should be able to understand the question and search for the findings that match the keywords "APAR", "fire", "2024", "hotel" in the findings table list. And then return the results to the user, BUT here's the thing: IF AI do all the hard work, not only the completeness and accuracy can be compromised, but also API cost will bloat.

Now here's what I want: 
-  First, AI has to be able to differentiate between simple search task, and more complicated ones, for example:
1. Simple: "Is there any findings about APAR (fire) in 2024 in hotel?
2. More complex: "Based on findings about hotel in 2024, what should a new hotel in 2025 cares the most?"

For simpler ones, AI SHOULD BE ABLE TO USE QUERY. Yes, SQLQUERY or query from firebase. So AI should:
1. Identify the type of task
2. Create relevant SQL Query (simple) or use RAG (complex) 

I want the flow of AI chatbot like this:
1. Mask all sensitive/personal data. (Local)
2. Identify user requirement and needs from the instruction (LLM API) 
3. Decide to user SQL Query (simple) or use RAG (Complex) or hybrid
4. Unmask the result and send to user complete and accurate.

This is becasue instruction might be worded different but the intent still same for example show me critical fingind 2024, show me severity critical 2024, show me highest risk findings 2024.


