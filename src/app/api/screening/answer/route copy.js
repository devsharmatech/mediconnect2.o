import { NextResponse } from "next/server";
import { openai, supabase } from "@/lib/supabaseAdmin";

function safeJSONParse(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error("JSON Parse Error:", error, "String:", str);
    return fallback;
  }
}

function cleanInput(text) {
  if (!text) return "";
  return text.trim().slice(0, 500); // Limit input length
}

function getGuidanceMessage(answer, context = "general") {
  const lowerAnswer = answer.toLowerCase().trim();
  
  // For symptom-related questions, provide more specific guidance
  if (context === "symptoms") {
    if (lowerAnswer.match(/^(na|no|nahi|nahi hai|nope|nahi h|no symptoms|none)$/)) {
      return "Thank you for confirming. Let me ask you about other aspects of your health.";
    }
    
    if (lowerAnswer.match(/^(yes|haan|han|ji haan|yes i do|hmm|ha)$/)) {
      return "Please describe the symptoms you're experiencing. For example: 'I have cough and fever' or 'Mujhe khansi aur bukhar hai'";
    }
  }
  
  // General guidance for other contexts
  if (lowerAnswer.match(/^(na|no|nahi|nahi hai|nope)$/)) {
    return "Thank you for your response. Let me ask the next question.";
  }
  
  if (lowerAnswer.match(/^(yes|haan|han|ji haan|yes i do)$/)) {
    return "Please provide more details so I can understand your situation better.";
  }
  
  if (answer.length < 2) {
    return "Please provide a bit more detail in your response.";
  }
  
  if (lowerAnswer.includes('thank') || lowerAnswer.includes('thanks')) {
    return "You're welcome! To help you better, please answer the medical questions.";
  }
  
  if (lowerAnswer.includes('ok') || lowerAnswer.includes('okay') || lowerAnswer === 'k') {
    return "Thank you. Let me ask the next question about your health.";
  }
  
  return "Please provide more details about your health concern.";
}

// Enhanced function to check if this is a valid response to medical questions
function isValidMedicalResponse(answer, screeningStage = 0) {
  if (!answer || answer.trim().length === 0) return false;
  
  const lowerAnswer = answer.toLowerCase().trim();
  
  // Always accept these common responses as valid in medical context
  const acceptedResponses = [
    // Negative responses
    'no', 'na', 'nahi', 'nahi hai', 'nope', 'no symptoms', 'none', 'kuch nahi', 'not really',
    // Positive responses  
    'yes', 'haan', 'han', 'ji haan', 'yes i do', 'hmm', 'ha', 'yes please',
    // Confirmations
    'ok', 'okay', 'sure', 'accha', 'theek hai', 'alright',
    // Short descriptions
    'fever', 'cough', 'headache', 'pain', 'bukhar', 'khansi', 'dard', 'cold', 'sore throat'
  ];
  
  // Check if it's a very short but common medical response
  if (answer.length <= 20) {
    const isAccepted = acceptedResponses.some(response => 
      lowerAnswer.includes(response) || response.includes(lowerAnswer)
    );
    
    if (isAccepted) {
      return true;
    }
  }
  
  // Check for medical keywords
  const medicalKeywords = [
    'fever', 'cough', 'cold', 'headache', 'pain', 'dizziness', 'nausea', 
    'vomiting', 'fatigue', 'weakness', 'bukhar', 'khansi', 'jukam', 'sard',
    'dard', 'chakkar', 'ulti', 'thakan', 'kamjori', 'temperature',
    'body', 'stomach', 'chest', 'throat', 'head', 'back', 'leg', 'arm',
    'days', 'hours', 'week', 'month', 'din', 'ghante', 'hafta', 'mahina',
    'medicine', 'dawa', 'pill', 'tablet', 'injection', 'doctor', 'doc', 'hospital',
    'symptom', 'feel', 'feeling', 'experience', 'having'
  ];
  
  return medicalKeywords.some(keyword => lowerAnswer.includes(keyword));
}

// Simple question generator for when OpenAI is unavailable
function generateFallbackQuestion(stage, previousAnswers = []) {
  const questions = [
    "Can you describe your main symptoms in more detail?",
    "How long have you been experiencing these symptoms?",
    "Have you taken any medication for this?",
    "Are you experiencing any other symptoms along with this?",
    "On a scale of 1-10, how severe would you rate your symptoms?"
  ];
  
  return {
    question: {
      id: `q${stage + 1}`,
      text: questions[Math.min(stage, questions.length - 1)],
      type: "text"
    }
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { screening_id, answer } = body;

    // Validate required fields
    if (!screening_id || !answer) {
      return NextResponse.json(
        { status: false, message: "screening_id and answer are required" },
        { status: 400 }
      );
    }

    // Clean and validate input
    const cleanAnswer = cleanInput(answer);
    if (!cleanAnswer) {
      return NextResponse.json(
        { status: false, message: "Please provide a valid response" },
        { status: 400 }
      );
    }

    // Step 1: Fetch screening session
    const { data: screening, error: screeningError } = await supabase
      .from("screening_sessions")
      .select("*")
      .eq("id", screening_id)
      .single();

    if (screeningError || !screening) {
      return NextResponse.json(
        { status: false, message: "Screening session not found" },
        { status: 404 }
      );
    }

    // Check if screening is already complete
    if (screening.status === "complete") {
      return NextResponse.json(
        {
          status: false,
          message: "This health screening has already been completed.",
          next_steps: "start_again_screening_if_needed",
        },
        { status: 400 }
      );
    }

    // 🧠 Step 2: Use simple validation instead of AI classification to avoid rate limits
    const isMedicalResponse = isValidMedicalResponse(cleanAnswer, screening.stage);

    // ❌ Step 3: Handle non-medical responses with better context
    if (!isMedicalResponse) {
      // Determine context for better guidance
      let context = "general";
      const lastQuestion = screening.questions?.[screening.questions.length - 1]?.text || "";
      
      if (lastQuestion.toLowerCase().includes('symptom') || 
          lastQuestion.toLowerCase().includes('feel') ||
          lastQuestion.toLowerCase().includes('have') ||
          lastQuestion.toLowerCase().includes('experience')) {
        context = "symptoms";
      }
      
      const guidanceMessage = getGuidanceMessage(cleanAnswer, context);
      
      return NextResponse.json({
        status: false,
        message: guidanceMessage,
        requires_clarification: true,
        user_response: cleanAnswer
      });
    }

    // ✅ Step 4: Proceed with medical screening
    const answers = Array.isArray(screening.answers)
      ? [...screening.answers]
      : [];
    const stage = screening.stage || 0;
    
    // Add the current answer
    answers.push({ 
      question_id: `q${stage}`, 
      answer: cleanAnswer,
      timestamp: new Date().toISOString(),
      is_medical: true
    });

    // If stage < 5, ask next question
    if (stage < 5) {
      let aiData;
      
      try {
        // Try to use OpenAI for generating next question
        const nextQuestionPrompt = `
You are Mediconnect AI — a professional clinical triage assistant.

PATIENT INITIAL SYMPTOMS: "${screening.initial_symptoms}"

CONVERSATION HISTORY:
${answers.map((a, i) => `Q${i}: ${a.question_id} → A${i}: ${a.answer}`).join("\n")}

Based on the conversation so far, ask ONE natural, conversational follow-up question to better understand the patient's condition.

Consider:
- Previous symptoms mentioned
- Need for clarification
- Typical medical triage progression
- Cultural sensitivity for Indian patients

Return strictly JSON format:
{
  "question": {
    "id": "q${stage + 1}",
    "text": "Your next question here...",
    "type": "text"
  }
}

Make the question clear, empathetic, and medically relevant.
`;

        const aiRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: nextQuestionPrompt }],
          temperature: 0.7,
          max_tokens: 150
        });

        aiData = safeJSONParse(
          aiRes.choices?.[0]?.message?.content || "{}",
          generateFallbackQuestion(stage, answers)
        );
        
      } catch (openaiError) {
        console.error("OpenAI API Error:", openaiError);
        
        // Use fallback question generator when OpenAI is unavailable
        aiData = generateFallbackQuestion(stage, answers);
        
        // Log the error but continue with fallback
        console.log(`Using fallback question for screening ${screening_id} due to OpenAI error`);
      }

      // Update screening session with new question and answer
      const { error: updateError } = await supabase
        .from("screening_sessions")
        .update({
          stage: stage + 1,
          answers,
          questions: [...(screening.questions || []), aiData.question],
          updated_at: new Date().toISOString(),
        })
        .eq("id", screening_id);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { status: false, message: "Failed to update screening session" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: true,
        stage: stage + 1,
        screening_id,
        next_question: aiData.question,
        progress: {
          current: stage + 1,
          total: 5,
          percentage: Math.round(((stage + 1) / 5) * 100)
        }
      });
    }

    // 🩺 Step 5: Generate final diagnosis at stage == 5
    let aiData;
    
    try {
      const diagnosisPrompt = `
You are Mediconnect AI — a professional clinical assistant providing preliminary assessment.

PATIENT INITIAL SYMPTOMS: "${screening.initial_symptoms}"

SYMPTOM HISTORY:
${answers.map((a, i) => `${i + 1}. ${a.question_id}: ${a.answer}`).join("\n")}

Based on the information provided, generate a comprehensive medical assessment.

Return STRICTLY VALID JSON with this structure:
{
  "summary": "Brief overview of patient's condition",
  "probable_diagnoses": [
    {"name": "Condition name", "confidence": 0.85, "notes": "Supporting reasons"}
  ],
  "recommended_specialties": ["Specialty1", "Specialty2"],
  "specializations": ["Specific area of specialization"],
  "recommended_lab_tests": ["Test1", "Test2"],
  "recommended_medicines": [
    {"name": "Medicine name", "dose": "Recommended dose", "notes": "Important precautions"}
  ],
  "urgency": "routine|urgent|emergency",
  "home_care_advice": ["Advice1", "Advice2"],
  "warning_signs": ["Sign1 that requires immediate attention", "Sign2"]
}

Important:
- Be clinically accurate but cautious
- Confidence scores should be realistic (0.0-1.0)
- Only recommend OTC medications when appropriate
- Consider Indian healthcare context
- Urgency levels: "emergency" for life-threatening, "urgent" for same-day care, "routine" for non-urgent
`;

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: diagnosisPrompt }],
        temperature: 0.3,
      });

      const content = aiRes.choices?.[0]?.message?.content;
      aiData = safeJSONParse(content, {
        summary: "Based on your symptoms, here's a preliminary assessment",
        probable_diagnoses: [{name: "Common viral infection", confidence: 0.7, notes: "Based on reported symptoms"}],
        recommended_specialties: ["General Physician"],
        specializations: ["General Medicine"],
        recommended_lab_tests: ["Complete Blood Count", "Fever Panel"],
        recommended_medicines: [{name: "Paracetamol", dose: "500mg as needed", notes: "For fever and pain relief"}],
        urgency: "routine",
        home_care_advice: ["Rest well", "Stay hydrated", "Monitor temperature"],
        warning_signs: ["High fever above 103°F", "Difficulty breathing", "Severe headache"]
      });
      
    } catch (openaiError) {
      console.error("OpenAI API Error for diagnosis:", openaiError);
      
      // Provide a basic fallback diagnosis when OpenAI is unavailable
      aiData = {
        summary: "Based on the symptoms you've described, here's a general assessment",
        probable_diagnoses: [{name: "Common health concern", confidence: 0.6, notes: "Consult a doctor for accurate diagnosis"}],
        recommended_specialties: ["General Physician"],
        specializations: ["General Medicine"],
        recommended_lab_tests: ["Basic health checkup recommended"],
        recommended_medicines: [],
        urgency: "routine",
        home_care_advice: ["Get adequate rest", "Maintain hydration", "Monitor symptoms"],
        warning_signs: ["Symptoms worsening", "High fever", "Difficulty breathing"]
      };
    }

    // Complete the screening session
    const { error: completeError } = await supabase
      .from("screening_sessions")
      .update({
        status: "complete",
        analysis: aiData,
        answers,
        stage: stage + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", screening_id);

    if (completeError) {
      console.error("Completion error:", completeError);
      return NextResponse.json(
        { status: false, message: "Failed to complete screening" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: true,
      screening_id,
      stage: stage + 1,
      analysis: aiData,
      message: "Health screening completed successfully",
      next_steps: {
        consult_specialist: aiData.recommended_specialties,
        urgency: aiData.urgency,
        lab_tests: aiData.recommended_lab_tests
      }
    });

  } catch (error) {
    console.error("Screening API Error:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "An unexpected error occurred. Please try again.";
    let statusCode = 500;
    
    if (error.message.includes("OpenAI") || error.message.includes("API") || error.message.includes("rate limit") || error.message.includes("429")) {
      errorMessage = "Our medical analysis service is temporarily busy. Please try again in a few moments.";
      statusCode = 503;
    } else if (error.message.includes("database") || error.message.includes("Supabase")) {
      errorMessage = "We're experiencing technical difficulties. Please try again shortly.";
      statusCode = 503;
    }
    
    return NextResponse.json(
      { 
        status: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}