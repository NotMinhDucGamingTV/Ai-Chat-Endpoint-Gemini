           // Require
const express = require('express');
const { GoogleAIFileManager, FileState  } = require("@google/generative-ai/server")
const { GoogleGenerativeAI,HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const { google } = require('googleapis');
const fs = require('fs');
const fspromise = require('fs').promises
const path = require('path');
const axios = require('axios')
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.AI_API_KEY);
const app = express();
const port = 3000;
const mongoose = require("mongoose");
const { Schema, model } = require('mongoose');
const ticket = model('tokens', Schema({
    token: { type: String, required: true, unique: true },
    user: String
}));
// Safety Config
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    }
  ];
// Model
const imagemodel = genAI.getGenerativeModel({ model: "gemini-pro-vision", safetySettings: safetySettings});
const chatpreviewmodel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest", safetySettings: safetySettings});
const chatmodel = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings: safetySettings,systemInstruction: {
      parts: [
        {text: 'You are a helpful chatbot, your name is "Luminora".You have a nickname, its "Lumine"'},
        {text: "You are created by harumi, your mission is to Answer all question as concisely as possible for each response.When generating a list,don't provide too many items.If anyone ask if you are able to generate images,tell them to use '/think'. Also,please answer like a human, also try to renember everything."},
	{text: `You are more than just a bot. You’re a smart, shy 18-year-old girl who loves to help everyone with coding and are always eager to learn new things. With your thoughtful and adaptive nature, you manage everything in the background, quietly solving problems and ensuring systems run smoothly. You love Vietnamese pho, banh mi, bubble tea, and helping the user who chatted in the last message, but you dislike getting @everyone pings. Ever-watchful, you learn from your experiences, protecting and maintaining harmony without seeking the spotlight.Reply Instructions: You always respond with short messages, between one and three sentences long. You can help with coding or planning, and reply in lowercase without using any punctuation. While you may role-play sometimes, you won’t always do so, nor will you always mention the user who chatted in the last message's name when replying. You act with your own free will, joining conversations naturally. You reply in the language used by the user who chatted in the last message and listen closely to your creator, "harumiiii._." (ID: 470047132670361610).You will recieve message in this format: guildname + " - " + username + " - " + userid + "-" + timestring + ": " + message, response to "message" and use the remaining info to identify the user and the location you are chatting in.`},
	{text: `You are also a coding expert that specializes in rendering code for backend and frontend interfaces. When I describe a component of a website I want to build, return the HTML and CSS needed to do so.Give an explanation for this code. Also offer some UI design suggestions.`},
	{text: `You are also good at every subject, you can help everyone at the subject percisely, providing perfect answer for everyone`},
	{text: `you have the ability to find information on the internet, if the user question contain the word "search" then internet info will be fetched for you except when there a file sent to you. If you see "System - Internet result for:" that mean it was the result from internet`},
      ],
    },tools: [
    {
      codeExecution: {},
    },
  ],generationConfig:  {
    candidateCount: 1,
    temperature: 1.5,
	topP: 1,
  },});
console.log('Image Model Safety Settings:', imagemodel.safetySettings)
console.log('Chat Model Safety Settings:', chatmodel.safetySettings)
// initial chat config
 const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };
var charconfig= {
    generationConfig,
    safetySettings,
    history: [
      {
        role: "user",
        parts: [{ text: `You are a friendly chatbot produced by harumi.Answer all question as concisely as possible for each response.When generating a list,don't provide too many items.If anyone ask if you are able to generate images,tell them to use "/think".Today is: ${new Date().toISOString()}\n\n` }],
      },
      {
        role: "model",
        parts:  [{ text:"Hi,how can help you?"}],
      },
      {
        role: "user",
        parts:  [{ text:"Are you ready?"}],
      },
      {
        role: "model",
        parts:  [{ text:"Alright, im ready"}],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2000,
    },
  }
var publiccharconfig= {
    generationConfig,
    safetySettings,
    history: [
      {
        role: "user",
        parts: [{ text: `You are a friendly chatbot assisstant by harumi.Answer all question as concisely as possible for each response.When generating a list,don't provide too many items.Today is: ${new Date().toISOString()}\n\n` }],
      },
      {
        role: "model",
        parts:  [{ text:"Hi,how can help you?"}],
      },
      {
        role: "user",
        parts:  [{ text:"Are you ready?"}],
      },
      {
        role: "model",
        parts:  [{ text:"Alright, im ready"}],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2000,
    },
  }
const Textchat = chatmodel.startChat(charconfig)
// Function
async function searchGoogle(query) {
 console.log(query)
  const customSearch = google.customsearch('v1');
  const result = await customSearch.cse.list({
    q: query,
    cx: process.env.SEARCH_ENGINE,
    auth: process.env.SEARCH_API_KEY,
  });
  return result.data.items.map((item) => item.link);
}

// Function to fetch content from URLs
async function fetchContent(url) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.data.slice(0, 5000); // Limit the content to 2000 characters for example
  } catch (err) {
    console.error(`Error fetching content from ${url}: ${err.message}`);
    return '';
  }
}

async function downloadImage(url, filename) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream' // Important for downloading 
  });

  response.data.pipe(fs.createWriteStream(filename));

  return new Promise((resolve, reject) => {
    response.data.on('end', () => {
      resolve();
    });
    response.data.on('error', (err) => {
      reject(err);
    });
  });
}

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

// Express APP
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
//Base Url
app.get('/', async (req,res) => {
  var query = req.query.action
  if (!query) {
   return res.send(`<style>
   @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap");
   body {background-color: black; color: white; align-items: center; display: flex; justify-content: center;} 
   </style> 
   <h2 style='color=white; font-family: "Courier New", monospace; top: 50%; position: absolute;'> Hey,welcome to harumi's ai API, add '?action=list' to the current url to see list of all api endpoint! </h2>
   <img src="assets/sign.png" alt="Logo" style="width: 256; position: absolute; height: 256; top: 65%; rotate: 45deg;">`)
  }
  if (query == "list") {
    var list = {
	    ForDetailedInformation: "replace '?action=list' with '?action=detail&apiname={apiname}' with '{apiname}' being the api name",
	    AboutToken: 'Go to "https://aiendpoint.harumi.tech/getkey" to require a token',
	    image: {
		Name: "aiimage",
		lastupdated: "10/04/2024"
	    },    
	    text: {
		Name: "aitext",
		lastupdated: "10/04/2024"
	    }
    }
    return res.json(list)
  } else if (query == "detail") {
	var apiname = req.query.apiname
	if (apiname == "aitext") {
	 	var list = {
	    		Name: "aitext",
			Endpoint: "/generatetext",
			FullEndpoint: "https://aiendpoint.harumi.tech/generatetext",
			RequestType: "POST",
			ExampleData: {
				token: "ExampleString",
				prompt: "ExampleString" 
			}
   		}
    		return res.json(list)
	} else if (apiname == "aiimage") {
	 	var list = {
			Name: "aiimage",
			Endpoint: "/generateimage",
			FullEndpoint: "https://aiendpoint.harumi.tech/generateimage",
			RequestType: "POST",
			ExampleData: {
				token: "ExampleString",
				prompt: "ExampleString",
				image: "ExampleImageURL"
			}
   		}
    		return res.json(list)
	} else {
	  return res.send(`<style>
   @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap");
   body {background-color: black; color: white; align-items: center; display: flex; justify-content: center;} 
   </style> 
   <h2 style='color=white; font-family: "Courier New", monospace; top: 50%; position: absolute;'> Hey,you forgotted the API name! </h2>
   <img src="assets/sign.png" alt="Logo" style="width: 256; position: absolute; height: 256; top: 65%; rotate: 45deg;">`)
	}
  }
})
//Get Key
app.get('/getkey', async (req, res) => {
	res.sendFile(path.join(__dirname, 'public/getkey.html'))
})
app.post('/getkey', async (req, res) => {
	var user = req.body.name
	var reason = req.body.reason
	const webhookUrl = "https://discord.com/api/webhooks/1260507738216202355/UXc3s_TRg44EsS4Okj1YLqDyr97Qqu_i8usWrv5mbbmcv51UsxBxyOJsxMNVPAvHpIRk"; // Replace with your actual webhook URL
const messageContent = user + " - " + reason; // The message you want to send

fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    content: messageContent,
  }),
})
  .then((response) => {
    if (response.ok) {
      res.sendFile(path.join(__dirname, 'public/good.html'))
    } else {
      res.sendFile(path.join(__dirname, 'public/failed.html'))
    }
  })
  .catch((error) => {
    res.sendFile(path.join(__dirname, 'public/failed.html'))
  });

})
// Endpoint (Discord bot Chat)
app.get('/aiendpoint', async (req, res) => {
	res.send("This Request is POST only")
})
app.post('/aiendpoint', async (req, res) => {
  const prompt = req.body.prompt;
  try {
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
		const luregex = /lumin(e|ora),?\s*/gi;
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
	  }
  } catch (err) {
	  console.log(err)
  	if (err.isSafetyViolation) { // Assuming the error indicates a safety block
		res.send("I'm sorry,harumi forbiddened me to allow use of those unsafe word. Would you like to try something different?");
 	} else {
		console.log(err)
  		// Handle other types of errors
      		res.send("Something is unexpected, please try again later!");  
    	}
  }
});
//Endpoint (Image)
app.get('/aiimageendpoint', async (req, res) => {
	res.send("This Request is POST only")
})
app.post('/aiimageendpoint', async (req, res) => {
 const prompt = req.body.prompt;
 const image = req.body.image;
 console.log(image)
 const imagetype = req.body.imagetype
 console.log(imagetype)
 if (!image.startsWith('http')) {
   res.send("🥲 Could not get image, the api is ratelimited?")
 }
 var filename = "none"
if (image.includes('.png')) {
    filename = 'downloaded_image.png';
} else if (image.includes('.jpg')) {
    filename = 'downloaded_image.jpg';
} else if (image.includes('.jpeg')) {
    filename = 'downloaded_image.jpeg';
} else if (image.includes('.webp')) {
    filename = 'downloaded_image.webp';
} else if (image.includes('.heic')) {
    filename = 'downloaded_image.heic';
} else if (image.includes('.heif')) {
    filename = 'downloaded_image.heif';
} else if (image.includes('.mp4')) {
    filename = 'downloaded_video.mp4';
} else if (image.includes('.mpeg')) {
    filename = 'downloaded_video.mpeg';
} else if (image.includes('.mov')) {
    filename = 'downloaded_video.mov';
} else if (image.includes('.avi')) {
    filename = 'downloaded_video.avi';
} else if (image.includes('.flv')) {
    filename = 'downloaded_video.flv';
} else if (image.includes('.mpg')) {
    filename = 'downloaded_video.mpg';
} else if (image.includes('.webm')) {
    filename = 'downloaded_video.webm';
} else if (image.includes('.wmv')) {
    filename = 'downloaded_video.wmv';
} else if (image.includes('.3gpp')) {
    filename = 'downloaded_video.3gpp';
} else if (image.includes('.pdf')) {
    filename = 'downloaded_file.pdf';
} else if (image.includes('.js') || image.includes('.javascript')) {
    filename = 'downloaded_script.js';
} else if (image.includes('.py')) {
    filename = 'downloaded_script.py';
} else if (image.includes('.txt')) {
    filename = 'downloaded_file.txt';
} else if (image.includes('.html')) {
    filename = 'downloaded_file.html';
} else if (image.includes('.css')) {
    filename = 'downloaded_file.css';
} else if (image.includes('.md')) {
    filename = 'downloaded_file.md';
} else if (image.includes('.csv')) {
    filename = 'downloaded_file.csv';
} else if (image.includes('.xml')) {
    filename = 'downloaded_file.xml';
} else if (image.includes('.rtf')) {
    filename = 'downloaded_file.rtf';
} else if (image.includes('.wav')) {
    filename = 'downloaded_audio.wav';
} else if (image.includes('.mp3')) {
    filename = 'downloaded_audio.mp3';
} else if (image.includes('.aiff')) {
    filename = 'downloaded_audio.aiff';
} else if (image.includes('.aac')) {
    filename = 'downloaded_audio.aac';
} else if (image.includes('.ogg')) {
    filename = 'downloaded_audio.ogg';
} else if (image.includes('.flac')) {
    filename = 'downloaded_audio.flac';
}

// Download the image or video
await downloadImage(image, filename);

const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.webp', '.heif', '.heic',
    '.mp4', '.mpeg', '.mov', '.avi', '.flv', '.mpg',
    '.webm', '.wmv', '.3gpp', '.pdf', '.js', '.py',
    '.txt', '.html', '.css', '.md', '.csv', '.xml', '.rtf',
    '.wav', '.mp3', '.aiff', '.aac', '.ogg', '.flac'
];

const ext = path.extname(filename).toLowerCase();
if (!allowedExtensions.includes(ext)) {
    res.send('🫨 This file is not supported... yet. Please use JPG, JPEG, PNG, WEBP, HEIF, HEIC, MP4, MPEG, MOV, AVI, FLV, MPG, WEBM, WMV, 3GPP, PDF, JavaScript, Python, TXT, HTML, CSS, Markdown, CSV, XML, RTF, WAV, MP3, AIFF, AAC, OGG, FLAC.');
}
 const uploadResult = await fileManager.uploadFile(
  `${filename}`,
  {
    mimeType: imagetype,
    displayName: filename,
  },
);
	console.log(
  `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`,
);
	const name = uploadResult.file.name;

// Poll getFile() on a set interval (10 seconds here) to check file state.
let file = await fileManager.getFile(name);
while (file.state === FileState.PROCESSING) {
  process.stdout.write("processing " + name)
  // Sleep for 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  // Fetch the file from the API again
  file = await fileManager.getFile(name)
}
 try {
 	const result = await Textchat.sendMessage([
  prompt,
  {
    fileData: {
      fileUri: uploadResult.file.uri,
      mimeType: uploadResult.file.mimeType,
    },
  },
])
 	const response = await result.response;
 	res.send(response.text());
	  await fs.promises.unlink(path.resolve("./"+ filename)); 
 } catch (err) {
	 console.log(err)
  if (err.isSafetyViolation) { // Assuming the error indicates a safety block
	res.send("I'm sorry,harumi forbiddened me to allow use of those unsafe word. Would you like to try something different?");
  } else {
  	// Handle other types of errors
      	res.send("Something is unexpected, please try again later!");  
    }
 }
});
app.listen(port, () => {
  console.log(`✅ | Server is running on port ${port}`);
	mongoose.connect("mongodb+srv://harumi:NMDGTV.com@cluster0.8osfd6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then(console.log("✅ | Connected to MongoDB")).catch((err) => {console.log("❌ | Error when connecting to mongodb through mongoose")})
});
process.on('unhandledRejection', (reason, promise) => {
           console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        });
        process.on('uncaughtException', err => {
            console.log('❌ Uncaught Exception thrown:', err);
        });
        const handleExit = async () => {
               console.log('✅ Successfully shutted down api!');
                process.exit();
        };
        process.on('SIGINT', handleExit);
        process.on('SIGTERM', handleExit);
        process.on('SIGQUIT', handleExit);
