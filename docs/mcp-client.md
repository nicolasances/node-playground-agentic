# MCP Client: Using tools exposed by an MCP Server

The example under [](../src/dlg/AnswerWithMCPTools.ts) shows how to do the following: 
- *Answer a User Prompt using Tools exposed by a **remote MCP Server**.*

To use this example from Postman, just run a `POST` on `http://localhost:<port>/<basepath>/prompt/mcp` : 
```json
{
    "model": "anthropic.claude-3.7-sonnet", 
    "prompt": "I'd like you to find if I have a topic in Tome that is centered around France and give me its details."
}
```