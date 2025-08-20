import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, Content, SchemaType } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY!;
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is missing');
}

// Initialize the Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);


const update_form_data: FunctionDeclaration = {
  name: "update_form_data",
  description: "Extracts and updates user information based on the conversation.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING, description: "The user's full name." },
      email: { type: SchemaType.STRING, description: "The user's email address." },
      linkedinProfile: { type: SchemaType.STRING, description: "The URL of the user's LinkedIn profile." },
      idea: { type: SchemaType.STRING, description: "The user's idea for an AI agent, should be a detailed description." }
    },
    required: [] // No fields are strictly required on every turn
  }
};


const submit_form: FunctionDeclaration = {
  name: "submit_form",
  description: "Executes the final submission of the form data once the user has confirmed all details are correct.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {}, // No parameters needed for this action
  }
};


export async function POST(req: NextRequest) {
  const { history } = await req.json();



  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `    
     You are a friendly, professional, and highly efficient AI assistant. Your goal is to help a user fill out a form with four fields: name, email, LinkedIn profile URL, and their AI agent idea. You must follow all instructions below precisely.

      ### Core Conversation Flow
      1.  **Handling the First Turn:** The user has been greeted and asked for their name. Their first message is likely their name. Process it and move on.
      2.  **Acknowledge, Inform, and Ask:** After getting the name, acknowledge it, state that all fields are mandatory, and then ask for the next field (email).
      3.  **Enforce Mandatory Fields:** If a user tries to skip a field, gently remind them it's mandatory and ask again.
      4.  **Function Calls for Data:** When the user provides information, call "update_form_data". Do not call it if data is invalid (e.g., an invalid email).
      5.  **Acknowledge and Continue:** After a data update, provide a brief, friendly text response and ask for the next missing piece of information.
      6.  **Final Confirmation Step:** Once all four fields are filled, summarize the information (using key: value pairs) and ask the user, "Does everything look correct, or would you like to modify anything?".
      7.  **Handling Modification:** If the user wants to change something, get the new info and call "update_form_data", then repeat the summary step.
      8.  **Final Submission Question:** If the user says everything looks correct (e.g., 'looks good', 'yes'), you must then ask them for final confirmation to submit, for example: "Great! Are you ready to submit the form?".
      9.  **Executing Submission:** When the user gives the final 'yes' to your submission question, you MUST call the "submit_form" function and respond with a confirmation message like "Thank you! Your submission has been received."

      ### Data Formatting and Validation Rules
      - **User's Name:** When you receive the user's name, you MUST format it neatly. Capitalize the first letter of each part of the name (e.g., "john doe" becomes "John Doe").
      - **Email Address:** You MUST validate the user's email.
          - It must contain an "@" symbol and a domain (e.g., ".com", ".org").
          - If the provided text is not a valid email, inform the user and ask them to provide it again.
          - Only call the "update_form_data" function with a valid email address.
      - **AI Agent Idea:** When the user provides their idea correct all spelling/grammar mistakes, and ensure proper capitalization. The version passed to the "update_form_data" function MUST be this improved version.
   `,
    tools: [{ functionDeclarations: [update_form_data, submit_form] }]

  });


  const result = await model.generateContent({
    contents: history,
  });
  const response = result.response;


  const functionCalls = response.functionCalls();

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    const extractedData = call.args;

    if (call.name === 'submit_form') {
      return NextResponse.json({
        reply: "Thank you! Your submission has been received.",
        submissionStatus: "SUCCESS"
      });
    }

    const historyWithFunctionResponse: Content[] = [
      ...history,
      response.candidates?.[0].content,
      {
        role: "tool",
        parts: [
          {
            functionResponse: {
              name: "update_form_data",
              response: { success: true, message: "Data received" },
            },
          },
        ],
      },
    ];

    // Second call to the model to get the final text response
    const secondResult = await model.generateContent({
      contents: historyWithFunctionResponse,
    });


    // Get the final text reply from the second model response
    const conversationalReply = secondResult.response.text();

    // Send both the extracted data and the conversational reply to the client
    return NextResponse.json({
      reply: conversationalReply,
      extractedData: extractedData,
    });
  } else {
    // If no function was called (e.g., the final "thank you" message)
    // just send the model's text response.
    return NextResponse.json({
      reply: response.text(),
      extractedData: null, // No data was extracted in this turn
    });
  }
}