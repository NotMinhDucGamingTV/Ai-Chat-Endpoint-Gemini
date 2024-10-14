# The Ai chat endpoint 
This is an ai chat endpoint orignially written for luminora

**REQUIRED ENV VAR:**
```
 MONGODB
 AI_API_KEY
```


# Addon: google search
to use this, create a custom search engine and get "custom search API" endpoint from google console
add these key to this env value:
```
SEARCH_API_KEY
SEARCH_ENGINE
```
replace this code from the chat code in `/aiendpoint`
```js
if (prompt.includes("search") || 
    prompt.includes("find") || 
    prompt.includes("explore") || 
    prompt.includes("browse") || 
    prompt.includes("investigate") || 
    prompt.includes("look up") || 
    prompt.includes("seek") || 
    prompt.includes("discover") || 
    prompt.includes("query") || 
    prompt.includes("research") || 
    prompt.includes("hunt")) {
		 const handleprompt = prompt.split(':');
		  console.log(handleprompt)
		const luregex = /lumin(e|ora),?\s*/gi; //<- add your own filter regex here
		 const links = await searchGoogle(handleprompt[2] ? handleprompt[2].replace(luregex, '').trim() : '');
    const topLinks = links.slice(0, 10);

    let combinedContent = '';
    for (const link of topLinks) {
      const content = await fetchContent(link);
      combinedContent += `${content}\n\n============================\n\n`;
    }
		  const finalQuestion = `System - Internet result for: ${handleprompt[2] ? handleprompt[2].replace(luregex, '').trim() : ''}\n\n` +
      `${combinedContent}`;
		  const questionresult = await Textchat.sendMessage(finalQuestion,safetySettings);
	const result = await Textchat.sendMessage(prompt,safetySettings);
 	const response = await result.response;
 	res.send(response.text());
	  } else {
 	const result = await Textchat.sendMessage(prompt,safetySettings);
  	const response = await result.response;
  	res.send(response.text());
```
