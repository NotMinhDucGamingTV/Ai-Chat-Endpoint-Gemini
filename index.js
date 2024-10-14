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
const chatmodel = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings: safetySettings,systemInstruction: {
      parts: [
        {text: 'You are a helpful chatbot'},
       /* Add ur own instruction here, follow this format
	{text: `hi`},
	*/
      ],
    },tools: [
    {
      codeExecution: {},
    },
  ],generationConfig:  {
	/* The following value are generation config
    candidateCount: 1,
    temperature: 1.5,
	topP: 1,
	*/
  },});
const Textchat = chatmodel.startChat()
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

// Endpoint (Discord bot Chat)
app.get('/aiendpoint', async (req, res) => {
	res.send("This Request is POST only")
})
app.post('/aiendpoint', async (req, res) => {
  const prompt = req.body.prompt;
  try {
 	const result = await Textchat.sendMessage(prompt,safetySettings);
  	const response = await result.response;
  	res.send(response.text());
  } catch (err) {
	  console.log(err)
  	if (err.isSafetyViolation) { // Assuming the error indicates a safety block
		res.send("I'm sorry,im forbiddened for the use of those unsafe word. Would you like to try something different?");
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
	res.send("I'm sorry,im forbiddened for the use of those unsafe word. Would you like to try something different?");
  } else {
  	// Handle other types of errors
      	res.send("Something is unexpected, please try again later!");  
    }
 }
});
app.listen(port, () => {
  console.log(`✅ | Server is running on port ${port}`);
	mongoose.connect(process.env.MONGODB, {
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
