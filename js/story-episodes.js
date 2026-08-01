// ============================================================
// STORY EPISODES — Datos estáticos del Story Mode (Immersion)
// ============================================================
// Equivalente vanilla del "static import" de data/episodes/princess/princess_001.json.
// No se hace fetch() porque al abrir el dashboard vía file:// el navegador
// bloquea la lectura de JSON local (CORS). Por eso el episodio vive como objeto JS.
//
// Cada escena tiene un scene_id único. El player (story-mode.js) construye un mapa
// scene_id -> scene y navega con next_scene (narrative) o branches[strength] (user_input).
//
// strength devuelto por la IA -> rama:
//   "strong"    -> branches.correct_strong
//   "weak"      -> branches.correct_weak
//   "incorrect" -> branches.incorrect

window.STORY_EPISODES = window.STORY_EPISODES || {};

window.STORY_EPISODES['princess_001'] = {
  "episode_id": "princess_001",
  "meta": {
    "title": "The Merchant's Bargain",
    "title_es": "El trato del mercader",
    "character": "princess",
    "character_name": "Princess Eleanor",
    "scenario": "negotiation_in_market",
    "level": "B2",
    "duration_minutes": 3,
    "can_extend_to": 8,
    "vocabulary_focus": ["negotiation", "diplomacy", "persuasion"],
    "target_words": ["leverage", "concede", "propose", "terms", "reluctant", "talk into", "settle for"],
    "art_style": "illuminated_manuscript_v2",
    "background_music": "medieval_tavern_soft"
  },

  "start_scene": "s1_arrival",

  "scenes": [
    {
      "scene_id": "s1_arrival",
      "type": "narrative",
      "duration_seconds": 30,
      "background_illustration": "episodios/princess/2.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "narrator",
          "text": "Princess Eleanor needs three barrels of saffron for the royal banquet. The merchant knows she's desperate.",
          "text_es": "La princesa Eleanor necesita tres barriles de azafrán para el banquete real. El mercader sabe que ella está desesperada.",
          "audio_url": "audio/s1_narrator.mp3"
        },
        {
          "speaker": "merchant",
          "text": "Three hundred gold pieces. Not a coin less, Your Highness.",
          "text_es": "Trescientas piezas de oro. Ni una moneda menos, Su Alteza.",
          "audio_url": "audio/s1_merchant_01.mp3",
          "emotion": "smug"
        },
        {
          "speaker": "princess",
          "text": "Three hundred? That's twice the going rate, Master Aldric.",
          "text_es": "¿Trescientas? Eso es el doble del precio habitual, Maestro Aldric.",
          "audio_url": "audio/s1_princess_01.mp3",
          "emotion": "controlled"
        }
      ],
      "next_scene": "s2_first_interaction"
    },

    {
      "scene_id": "s2_first_interaction",
      "type": "user_input",
      "background_illustration": "episodios/princess/2.jpg",
      "setup_dialogue": [
        {
          "speaker": "merchant",
          "text": "The saffron comes from beyond the eastern sea. Storms have delayed three caravans this month. If you want it for the banquet, this is the price.",
          "text_es": "El azafrán viene de más allá del mar oriental. Las tormentas han retrasado tres caravanas este mes. Si lo quieres para el banquete, este es el precio.",
          "audio_url": "audio/s2_merchant.mp3"
        }
      ],
      "interaction": {
        "prompt_es": "El mercader está usando la escasez como excusa. La princesa debe presionarlo sin perder elegancia. ¿Qué le dice?",
        "input_mode": "text_or_voice",
        "context_hint": "Tip: una negociadora hábil señala lo que el otro tiene que perder, no lo que ella quiere.",
        "target_vocabulary": ["leverage", "afford", "competitor", "reputation"],
        "example_native_responses": [
          "I'm sure your competitors would be happy to take this order, Master Aldric. Can you really afford to lose the crown's business?",
          "Other merchants would leverage this opportunity with the royal house. Are you certain you want to lose it?",
          "Your reputation depends on serving the crown, not on a single sale."
        ],
        "evaluation_criteria": {
          "must_be_present": "any form of leverage, threat of going elsewhere, or appeal to merchant's reputation",
          "tone_required": "firm but polite",
          "grammar_focus": ["conditional_structures", "rhetorical_questions"],
          "common_errors_to_catch": [
            {
              "pattern": "I want cheaper price",
              "feedback": "Demasiado directo y gramaticalmente forzado. Una princesa nunca pide — sugiere consecuencias."
            },
            {
              "pattern": "you must lower the price",
              "feedback": "'Must' suena agresivo. En negociación se usa 'might want to consider' o 'would be wise to'."
            }
          ]
        },
        "ai_call_required": true,
        "ai_evaluation_prompt": "You are evaluating a B2 English learner's response in a roleplay where they play Princess Eleanor negotiating with a merchant. SETUP: The merchant just demanded triple the price citing supply shortages and storms. The princess must apply pressure WITHOUT being rude — a skilled negotiator points at what the OTHER side stands to lose (going to competitors, damaging reputation with the crown), not at what she wants. Target vocabulary: leverage, afford, competitor, reputation. Grammar focus: conditionals and rhetorical questions. Judge STRENGTH: 'strong' = applies clear leverage/consequence with poise and good grammar; 'weak' = polite but timid, asks for a discount without real pressure, or has minor errors; 'incorrect' = rude, demanding ('you must'), off-topic, or grammatically broken."
      },
      "branches": {
        "correct_strong": "s3_merchant_backing_down",
        "correct_weak": "s3_merchant_pushes_back",
        "incorrect": "s3_merchant_walks_away_threat"
      }
    },

    {
      "scene_id": "s3_merchant_backing_down",
      "type": "narrative",
      "duration_seconds": 25,
      "background_illustration": "episodios/princess/3.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "merchant",
          "text": "Your Highness... perhaps I was hasty. Two hundred and fifty? In honor of the crown.",
          "text_es": "Su Alteza... quizás fui apresurado. ¿Doscientas cincuenta? En honor a la corona.",
          "audio_url": "audio/s3a_merchant.mp3",
          "emotion": "nervous"
        }
      ],
      "vocabulary_popup": {
        "trigger_word": "hasty",
        "popup_duration_seconds": 4,
        "popup_content": {
          "word": "hasty",
          "meaning_es": "apresurado, dicho sin pensar",
          "native_mental_image": "Imagina a alguien que se tira al agua sin medir la profundidad. Eso es 'hasty'. No es solo 'rápido' — es rápido y por eso peligroso.",
          "real_usage": "'Don't be hasty' es lo que un nativo le dice a alguien que está a punto de tomar una mala decisión emocional. Es suave pero firme."
        }
      },
      "next_scene": "s4_second_interaction"
    },

    {
      "scene_id": "s3_merchant_pushes_back",
      "type": "narrative",
      "duration_seconds": 25,
      "background_illustration": "episodios/princess/3.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "merchant",
          "text": "A fair point, Your Highness. But I won't give it away. Two hundred and eighty — and I'm holding my ground there.",
          "text_es": "Un buen punto, Su Alteza. Pero no lo voy a regalar. Doscientas ochenta — y de ahí no me muevo.",
          "audio_url": "audio/s3b_merchant.mp3",
          "emotion": "guarded"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "hold one's ground",
        "popup_duration_seconds": 4,
        "popup_content": {
          "phrase": "to hold your ground",
          "meaning_es": "no ceder, mantener tu posición",
          "native_mental_image": "Imagina tus pies clavados en el suelo mientras alguien te empuja. No avanzas, pero tampoco retrocedes. Esa firmeza física ES la frase.",
          "real_usage": "Cuando un nativo dice 'I'm holding my ground', te avisa que ya no va a ceder más. En una negociación es la señal de que llegaste casi al límite del otro."
        }
      },
      "next_scene": "s4_second_interaction"
    },

    {
      "scene_id": "s3_merchant_walks_away_threat",
      "type": "narrative",
      "duration_seconds": 28,
      "background_illustration": "episodios/princess/3.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "merchant",
          "text": "I won't be spoken to like a common thief at my own stall. Perhaps Your Highness should buy elsewhere.",
          "text_es": "No permitiré que me hablen como a un ladrón común en mi propio puesto. Quizás Su Alteza debería comprar en otro lado.",
          "audio_url": "audio/s3c_merchant.mp3",
          "emotion": "offended"
        },
        {
          "speaker": "narrator",
          "text": "Eleanor lets the silence hang. Then, a small, gracious smile. She has overplayed her hand — but a princess never lets it show.",
          "text_es": "Eleanor deja que el silencio se extienda. Luego, una sonrisa pequeña y gentil. Se ha pasado de la raya — pero una princesa nunca lo deja ver.",
          "audio_url": "audio/s3c_narrator.mp3"
        },
        {
          "speaker": "merchant",
          "text": "...Two hundred and ninety. For the sake of the banquet. Let us start again.",
          "text_es": "...Doscientas noventa. Por el bien del banquete. Empecemos de nuevo.",
          "audio_url": "audio/s3c_merchant2.mp3",
          "emotion": "reluctant"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "overplay your hand",
        "popup_duration_seconds": 4,
        "popup_content": {
          "phrase": "to overplay your hand",
          "meaning_es": "presionar de más y perder la ventaja que tenías",
          "native_mental_image": "Viene del póker: tenías buenas cartas, apostaste demasiado, y asustaste al otro o lo hiciste enojar. Empujaste más allá de lo que tu posición aguantaba.",
          "real_usage": "Un nativo dice 'you overplayed your hand' cuando alguien tenía razón pero se pasó de agresivo y arruinó el trato. Es el error clásico del que negocia sin paciencia."
        }
      },
      "next_scene": "s4_second_interaction"
    },

    {
      "scene_id": "s4_second_interaction",
      "type": "user_input",
      "background_illustration": "episodios/princess/4.jpg",
      "setup_dialogue": [
        {
          "speaker": "princess_inner_thought",
          "text": "Two hundred and fifty is still too much. But pushing further could break the deal entirely.",
          "text_es": "Doscientas cincuenta sigue siendo demasiado. Pero presionar más podría romper el trato por completo.",
          "audio_url": "audio/s4_princess_thought.mp3",
          "is_thought_bubble": true
        }
      ],
      "interaction": {
        "prompt_es": "El mercader bajó el precio pero sigue siendo caro. La princesa quiere bajar más, pero sin romper el trato. ¿Cómo lo logra?",
        "input_mode": "text_or_voice",
        "context_hint": "Tip nativo: cuando quieres bajar más sin parecer codicioso, ofreces algo a cambio. 'I'll accept X if you...'",
        "target_vocabulary": ["settle for", "in exchange", "throw in", "agree to"],
        "example_native_responses": [
          "I'll settle for two hundred if you throw in a barrel of cinnamon.",
          "Two hundred, and I'll send other nobles your way after the banquet.",
          "I can agree to two-twenty if delivery is at the castle by Friday."
        ],
        "evaluation_criteria": {
          "must_be_present": "counter-offer with added condition or trade",
          "tone_required": "collaborative not aggressive",
          "common_errors_to_catch": [
            {
              "pattern": "I will accept",
              "feedback": "'I will' es muy rígido. 'I'll settle for' o 'I can agree to' suenan como negociación real."
            }
          ]
        },
        "ai_call_required": true,
        "ai_evaluation_prompt": "You are evaluating a B2 English learner's response in a roleplay where they play Princess Eleanor negotiating with a merchant. SETUP: The merchant has lowered his price but it is still high. The princess wants a better price WITHOUT breaking the deal — the native move is to offer something in exchange ('I'll settle for X if you throw in Y', 'I can agree to X if...'). Target vocabulary: settle for, in exchange, throw in, agree to. Tone must be collaborative, not aggressive. Judge STRENGTH: 'strong' = makes a clear counter-offer WITH a trade/condition, natural and collaborative; 'weak' = accepts too easily or lowers the price without offering anything in return; 'incorrect' = rude, walks away, makes an absurd demand, or is grammatically broken."
      },
      "branches": {
        "correct_strong": "s5_deal_closed",
        "correct_weak": "s5_deal_closed_smaller_win",
        "incorrect": "s5_merchant_offended"
      }
    },

    {
      "scene_id": "s5_deal_closed",
      "type": "narrative",
      "duration_seconds": 20,
      "background_illustration": "episodios/princess/5.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "merchant",
          "text": "You drive a hard bargain, Your Highness. Done. Two hundred, and I'll throw in the cinnamon.",
          "text_es": "Negocia usted duro, Su Alteza. Hecho. Doscientas, y le añado la canela.",
          "audio_url": "audio/s5_merchant.mp3",
          "emotion": "defeated_respect"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "drive a hard bargain",
        "popup_duration_seconds": 4,
        "popup_content": {
          "phrase": "to drive a hard bargain",
          "meaning_es": "negociar duro, sacar buen trato",
          "native_mental_image": "Imagina a alguien manejando un caballo difícil — 'driving' es controlar algo que resiste. Cuando alguien 'drives a hard bargain' está obligando al otro a ceder más de lo que quería.",
          "real_usage": "Es un cumplido y una queja al mismo tiempo. Cuando un nativo te dice 'you drive a hard bargain', está reconociendo que perdió."
        }
      },
      "next_scene": "s6_choice_point"
    },

    {
      "scene_id": "s5_deal_closed_smaller_win",
      "type": "narrative",
      "duration_seconds": 20,
      "background_illustration": "episodios/princess/5.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "merchant",
          "text": "Two hundred and thirty it is, then. A fair price. We've met halfway, Your Highness.",
          "text_es": "Doscientas treinta, entonces. Un precio justo. Nos hemos encontrado a mitad de camino, Su Alteza.",
          "audio_url": "audio/s5b_merchant.mp3",
          "emotion": "satisfied"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "meet halfway",
        "popup_duration_seconds": 4,
        "popup_content": {
          "phrase": "to meet halfway",
          "meaning_es": "ceder un poco cada uno para llegar a un acuerdo",
          "native_mental_image": "Dos personas caminando una hacia la otra y parándose justo en el centro. Nadie recorrió todo el camino; cada uno avanzó la mitad.",
          "real_usage": "'Let's meet halfway' es la frase con la que un nativo propone un acuerdo justo. No ganaste del todo, pero tampoco perdiste — y la relación queda sana para la próxima."
        }
      },
      "next_scene": "s6_choice_point"
    },

    {
      "scene_id": "s5_merchant_offended",
      "type": "narrative",
      "duration_seconds": 24,
      "background_illustration": "episodios/princess/3.jpg",
      "characters_on_screen": ["princess", "merchant"],
      "dialogue": [
        {
          "speaker": "merchant",
          "text": "That is no way to close a deal, Your Highness. You nearly soured the whole thing.",
          "text_es": "Esa no es manera de cerrar un trato, Su Alteza. Casi echa a perder todo el asunto.",
          "audio_url": "audio/s5c_merchant.mp3",
          "emotion": "cold"
        },
        {
          "speaker": "merchant",
          "text": "Still... two hundred and fifty, as offered. Take it before I change my mind.",
          "text_es": "Aun así... doscientas cincuenta, como ofrecí. Tómelo antes de que cambie de opinión.",
          "audio_url": "audio/s5c_merchant2.mp3",
          "emotion": "curt"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "sour the deal",
        "popup_duration_seconds": 4,
        "popup_content": {
          "phrase": "to sour a deal",
          "meaning_es": "arruinar o enfriar un trato que iba bien",
          "native_mental_image": "Como la leche que se corta: estaba buena y de pronto se echó a perder. Una palabra de más, un tono equivocado, y el trato 'se agrió'.",
          "real_usage": "Un nativo dice 'that soured the deal' cuando algo emocional — una grosería, una exigencia — dañó una negociación que iba bien. El precio aún se cerró, pero la buena voluntad se perdió."
        }
      },
      "next_scene": "s6_choice_point"
    },

    {
      "scene_id": "s6_choice_point",
      "type": "extension_offer",
      "background_illustration": "episodios/princess/6.jpg",
      "summary": {
        "vocabulary_learned": ["leverage", "hasty", "settle for", "drive a hard bargain", "throw in"],
        "interactions_completed": 2,
        "naturalness_avg": 4.2,
        "score": 87
      },
      "next_options": [
        {
          "label_es": "Continuar la historia (5 min más)",
          "next_episode_branch": "princess_001_extended",
          "preview": "Mientras sale del mercado, un noble misterioso se acerca a la princesa con una propuesta peligrosa..."
        },
        {
          "label_es": "Terminar y guardar progreso",
          "action": "save_and_exit"
        },
        {
          "label_es": "Repetir esta escena (sin perder progreso)",
          "action": "replay_episode"
        }
      ]
    }
  ],

  "post_episode_review": {
    "words_to_remember": [
      {
        "word": "leverage",
        "context_in_story": "Other merchants would leverage this opportunity",
        "tip": "leverage = aprovechar una ventaja que el otro no puede ignorar"
      },
      {
        "word": "settle for",
        "context_in_story": "I'll settle for two hundred",
        "tip": "settle for = aceptar algo menor de lo ideal. Tiene un dejo de resignación elegante."
      },
      {
        "word": "throw in",
        "context_in_story": "I'll throw in the cinnamon",
        "tip": "throw in = agregar algo extra al trato. La imagen mental es 'tirar algo encima' como bonus."
      }
    ],
    "review_in_days": 3
  }
};

// ============================================================
// EPISODIO 2 — detective_001 "El robo de medianoche"
// Convertido tal cual desde episodios/episode_detective_001.json.
// Único campo añadido: "start_scene" (campo estructural que lee el motor,
// igual que princess_001). Nada de contenido inventado.
// ============================================================
window.STORY_EPISODES['detective_001'] = {
  "episode_id": "detective_001",
  "meta": {
    "title": "The Midnight Theft",
    "title_es": "El robo de medianoche",
    "character": "detective",
    "character_name": "Detective Morgan",
    "scenario": "interrogation_room",
    "level": "B2",
    "duration_minutes": 3,
    "can_extend_to": 8,
    "vocabulary_focus": ["interrogation", "crime", "deduction"],
    "target_words": ["alibi", "suspect", "evidence", "admit", "deny", "where were you", "claim", "lying", "match up", "come clean"],
    "art_style": "noir_interrogation_v1",
    "background_music": "tense_noir_low"
  },

  "start_scene": "s1_setup",

  "premise_es": "Anoche robaron una joya invaluable del Museo Hartwell entre las 11pm y la medianoche. El sistema de seguridad estuvo caído exactamente 14 minutos — alguien lo sabía. Hay tres sospechosos pero solo uno tuvo acceso. Tú eres el Detective Morgan. Tu trabajo es interrogar a Daniel Reyes, el guardia nocturno, y descubrir si miente. Cada pregunta que haces destapa una pista nueva. Las contradicciones en su historia son lo que lo delata.",

  "scenes": [
    {
      "scene_id": "s1_setup",
      "type": "narrative",
      "duration_seconds": 30,
      "background_illustration": "interrogation_room_dark.png",
      "characters_on_screen": ["detective", "suspect"],
      "dialogue": [
        {
          "speaker": "narrator",
          "text": "11:47 PM. The Hartwell Museum's most valuable diamond is gone. The security system went dark for exactly fourteen minutes — and only one man knew the schedule. Daniel Reyes, the night guard, sits across from you. He's sweating.",
          "text_es": "11:47 PM. El diamante más valioso del Museo Hartwell desapareció. El sistema de seguridad se apagó por exactamente catorce minutos — y solo un hombre conocía el horario. Daniel Reyes, el guardia nocturno, está sentado frente a ti. Está sudando.",
          "audio_url": "audio/det_s1_narrator.mp3"
        },
        {
          "speaker": "suspect",
          "text": "Detective, I already told the other officer everything. I was doing my rounds. I didn't see anything.",
          "audio_url": "audio/det_s1_suspect_01.mp3",
          "emotion": "defensive"
        },
        {
          "speaker": "detective",
          "text": "Sit down, Mr. Reyes. We're going to go through your night one more time. Slowly.",
          "audio_url": "audio/det_s1_detective_01.mp3",
          "emotion": "calm_authority"
        }
      ],
      "next_scene": "s2_first_interrogation"
    },

    {
      "scene_id": "s2_first_interrogation",
      "type": "user_input",
      "background_illustration": "interrogation_room_dark.png",
      "setup_dialogue": [
        {
          "speaker": "suspect",
          "text": "Look, I clocked in at ten. Did my first round at ten-thirty. Everything was normal. I don't know what else you want from me.",
          "audio_url": "audio/det_s2_suspect.mp3",
          "emotion": "nervous"
        }
      ],
      "interaction": {
        "prompt_es": "Reyes dice que todo estaba normal. Pero tú sabes que el sistema se cayó entre las 11 y medianoche. Pregúntale dónde estaba exactamente en ese momento — sin revelar todavía que sabes lo del apagón.",
        "input_mode": "text_or_voice",
        "context_hint": "Tip de detective: la pregunta clave en cualquier interrogatorio es 'Where were you?' — pero un buen detective la hace específica con la hora exacta para atrapar al sospechoso en una mentira.",
        "target_vocabulary": ["where were you", "exactly", "between", "alibi"],
        "example_native_responses": [
          "Where were you between eleven and midnight, exactly?",
          "Walk me through what you were doing at eleven o'clock. Be specific.",
          "So tell me — where exactly were you when the system went down?"
        ],
        "evaluation_criteria": {
          "must_be_present": "a question asking about his location/whereabouts during the critical time window",
          "tone_required": "firm investigative tone",
          "grammar_focus": ["past_continuous", "question_word_order", "time_prepositions"],
          "common_errors_to_catch": [
            {
              "pattern": "where you were",
              "feedback": "En preguntas directas el orden es 'Where WERE you', no 'where you were'. Esa inversión es la marca de una pregunta correcta en inglés."
            },
            {
              "pattern": "what you did",
              "feedback": "'What did you do' para una pregunta directa. El auxiliar 'did' va antes del sujeto."
            }
          ]
        },
        "ai_call_required": true,
        "ai_evaluation_prompt": "You are evaluating a B2 English learner's response in a detective roleplay. The user plays Detective Morgan interrogating a night guard suspected of theft. The suspect just claimed everything was normal during his shift. The detective needs to ask WHERE the suspect was during the critical 11pm-midnight window, ideally without revealing he knows about the security blackout yet. Evaluate: 1) Did they ask a clear question about the suspect's whereabouts/location during the time window? 2) Grammar — focus on question word order (inversion) and past tense. 3) Naturalness — does it sound like a real detective interrogation? Return ONLY valid JSON: {is_correct: bool, strength: 'strong'|'weak'|'incorrect', grammar_errors: [{original, corrected, explanation_in_spanish}], naturalness_score: 1-5, native_alternative: string, why_native_better_in_spanish: string, vocabulary_used_correctly: [], vocabulary_missed_opportunity: []}. 'strong' = clear specific question with good grammar and investigative tone. 'weak' = asks but vague or minor grammar issues. 'incorrect' = off-topic, wrong language, or doesn't ask about whereabouts."
      },
      "branches": {
        "correct_strong": "s3_suspect_slips",
        "correct_weak": "s3_suspect_vague",
        "incorrect": "s3_suspect_deflects"
      }
    },

    {
      "scene_id": "s3_suspect_slips",
      "type": "narrative",
      "duration_seconds": 25,
      "background_illustration": "suspect_closeup_sweating.png",
      "dialogue": [
        {
          "speaker": "suspect",
          "text": "I was... in the east wing. The whole time. From eleven until my break at midnight. I never left.",
          "audio_url": "audio/det_s3a_suspect.mp3",
          "emotion": "too_quick"
        },
        {
          "speaker": "narrator",
          "text": "Too fast. Too rehearsed. And the diamond was stolen from the WEST wing.",
          "text_es": "Demasiado rápido. Demasiado ensayado. Y el diamante fue robado del ala OESTE.",
          "audio_url": "audio/det_s3a_narrator.mp3"
        }
      ],
      "vocabulary_popup": {
        "trigger_word": "alibi",
        "popup_duration_seconds": 4,
        "popup_content": {
          "word": "alibi",
          "meaning_es": "coartada — la prueba de que estabas en otro lugar",
          "native_mental_image": "Imagina a alguien diciendo 'no pude ser yo, estaba ALLÁ'. Un alibi es esa historia de 'estaba en otro lado'. La palabra viene del latín 'en otro lugar'. Cuando el alibi es falso, se le llama 'a fabricated alibi'.",
          "real_usage": "En todas las series de crimen en inglés escucharás 'What's your alibi?' o 'His alibi checks out' (su coartada se confirma) vs 'His alibi doesn't hold up' (su coartada no se sostiene)."
        }
      },
      "next_scene": "s4_second_interrogation"
    },

    {
      "scene_id": "s3_suspect_vague",
      "type": "narrative",
      "duration_seconds": 22,
      "background_illustration": "suspect_closeup_sweating.png",
      "dialogue": [
        {
          "speaker": "suspect",
          "text": "Around the museum, you know. Doing my job. I don't remember every single minute, Detective.",
          "audio_url": "audio/det_s3b_suspect.mp3",
          "emotion": "evasive"
        }
      ],
      "vocabulary_popup": {
        "trigger_word": "alibi",
        "popup_duration_seconds": 4,
        "popup_content": {
          "word": "alibi",
          "meaning_es": "coartada — la prueba de que estabas en otro lugar",
          "native_mental_image": "Un alibi es la historia de 'yo estaba en otro lado'. Cuando alguien es vago sobre dónde estaba, los detectives dicen 'his alibi is shaky' — su coartada es temblorosa, débil.",
          "real_usage": "'He couldn't give a solid alibi' = no pudo dar una coartada firme. La vaguedad es sospechosa en sí misma."
        }
      },
      "next_scene": "s4_second_interrogation"
    },

    {
      "scene_id": "s3_suspect_deflects",
      "type": "narrative",
      "duration_seconds": 20,
      "background_illustration": "suspect_closeup_sweating.png",
      "dialogue": [
        {
          "speaker": "suspect",
          "text": "Why are you asking me all this? Am I a suspect now? I want to know my rights.",
          "audio_url": "audio/det_s3c_suspect.mp3",
          "emotion": "aggressive"
        },
        {
          "speaker": "detective",
          "text": "Nobody said you're a suspect. Yet. Let's try again.",
          "audio_url": "audio/det_s3c_detective.mp3",
          "emotion": "patient"
        }
      ],
      "vocabulary_popup": {
        "trigger_word": "suspect",
        "popup_duration_seconds": 4,
        "popup_content": {
          "word": "suspect",
          "meaning_es": "sospechoso (sustantivo) / sospechar (verbo)",
          "native_mental_image": "Ojo con la pronunciación: el SUStantivo (la persona) es SUS-pect, con el peso al inicio. El VERBO (sospechar) es sus-PECT, con el peso al final. Los nativos cambian el acento según el significado.",
          "real_usage": "'You're a suspect' (eres sospechoso) vs 'I suspect him' (sospecho de él). Mismo escrito, distinto sonido."
        }
      },
      "next_scene": "s4_second_interrogation"
    },

    {
      "scene_id": "s4_second_interrogation",
      "type": "user_input",
      "background_illustration": "evidence_photo_on_table.png",
      "setup_dialogue": [
        {
          "speaker": "narrator",
          "text": "You slide a photo across the table. Security footage timestamp: 11:08 PM. Reyes, in the WEST wing — exactly where the diamond was stolen. He said he was in the east wing.",
          "text_es": "Deslizas una foto sobre la mesa. Sello de tiempo de la cámara: 11:08 PM. Reyes, en el ala OESTE — exactamente donde robaron el diamante. Él dijo que estaba en el ala este.",
          "audio_url": "audio/det_s4_narrator.mp3"
        },
        {
          "speaker": "suspect",
          "text": "That... that could be from any night. You can't prove that's last night.",
          "audio_url": "audio/det_s4_suspect.mp3",
          "emotion": "panicking"
        }
      ],
      "interaction": {
        "prompt_es": "Tienes la prueba en la mesa. Su historia no cuadra con la foto. Confróntalo: señala que su coartada no coincide con la evidencia y dale la oportunidad de confesar.",
        "input_mode": "text_or_voice",
        "context_hint": "Tip de detective: cuando tienes la prueba, no acusas directamente — señalas la contradicción y dejas que el silencio lo presione. 'Your story doesn't match the evidence.'",
        "target_vocabulary": ["evidence", "doesn't match", "lying", "come clean", "admit", "deny"],
        "example_native_responses": [
          "Your story doesn't match the evidence, Daniel. The timestamp proves it. Why don't you come clean?",
          "You said the east wing. The photo says west. One of you is lying — and it's not the camera.",
          "The evidence contradicts your alibi. This is your chance to admit what really happened."
        ],
        "evaluation_criteria": {
          "must_be_present": "pointing out the contradiction between his story and the evidence, OR inviting him to confess",
          "tone_required": "controlled pressure, not shouting",
          "grammar_focus": ["present_simple_for_facts", "phrasal_verbs"],
          "common_errors_to_catch": [
            {
              "pattern": "you are liar",
              "feedback": "Falta el artículo: 'you are A liar'. O mejor aún, el verbo: 'you're lying' suena más natural y acusatorio."
            },
            {
              "pattern": "your story no match",
              "feedback": "Necesita el auxiliar: 'your story doesn't match'. En presente negativo siempre va 'doesn't' antes del verbo."
            }
          ]
        },
        "ai_call_required": true,
        "ai_evaluation_prompt": "You are evaluating a B2 English learner playing Detective Morgan. He has just shown photographic evidence placing the suspect at the crime scene, contradicting the suspect's alibi (suspect claimed east wing, photo shows west wing). The detective should confront the suspect by pointing out the contradiction and/or inviting a confession, with controlled pressure. Evaluate: 1) Did they point out the contradiction or invite confession? 2) Grammar — present simple for facts, negative auxiliaries (doesn't), phrasal verbs (come clean, own up). 3) Naturalness as a detective confronting a suspect with evidence. Return ONLY valid JSON: {is_correct: bool, strength: 'strong'|'weak'|'incorrect', grammar_errors: [{original, corrected, explanation_in_spanish}], naturalness_score: 1-5, native_alternative: string, why_native_better_in_spanish: string, vocabulary_used_correctly: [], vocabulary_missed_opportunity: []}."
      },
      "branches": {
        "correct_strong": "s5_confession",
        "correct_weak": "s5_partial_confession",
        "incorrect": "s5_suspect_lawyers_up"
      }
    },

    {
      "scene_id": "s5_confession",
      "type": "narrative",
      "duration_seconds": 25,
      "background_illustration": "suspect_breaking_down.png",
      "dialogue": [
        {
          "speaker": "suspect",
          "text": "Okay. OKAY. I knew the system would be down for maintenance. Fourteen minutes. I needed the money, Detective. I never thought... I'm sorry.",
          "audio_url": "audio/det_s5_suspect.mp3",
          "emotion": "broken"
        },
        {
          "speaker": "detective",
          "text": "There it is. Daniel Reyes, you're under arrest for the theft of the Hartwell Diamond.",
          "audio_url": "audio/det_s5_detective.mp3",
          "emotion": "resolved"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "come clean",
        "popup_content": {
          "phrase": "to come clean",
          "meaning_es": "confesar, decir la verdad por fin",
          "native_mental_image": "Imagina a alguien sucio de mentiras que finalmente se 'limpia' diciendo la verdad. 'Come clean' es literalmente salir limpio confesando. La culpa es la suciedad; la confesión es el agua.",
          "real_usage": "'Just come clean' es lo que le dices a alguien que sabes que miente: 'solo di la verdad ya'. Es más suave y humano que 'confess', que suena legal y frío."
        }
      },
      "next_scene": "s6_choice_point"
    },

    {
      "scene_id": "s5_partial_confession",
      "type": "narrative",
      "duration_seconds": 22,
      "background_illustration": "suspect_breaking_down.png",
      "dialogue": [
        {
          "speaker": "suspect",
          "text": "Fine. I was in the west wing. But I didn't take anything! I just... I looked the other way. Someone paid me to look the other way.",
          "audio_url": "audio/det_s5b_suspect.mp3",
          "emotion": "cornered"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "look the other way",
        "popup_content": {
          "phrase": "to look the other way",
          "meaning_es": "hacerse de la vista gorda, ignorar algo a propósito",
          "native_mental_image": "Literalmente girar la cabeza para no ver algo malo que está pasando. Es complicidad pasiva — no haces el crimen, pero dejas que pase.",
          "real_usage": "'The guard looked the other way' = el guardia se hizo el que no vio. Muy usado en contextos de corrupción y crimen."
        }
      },
      "next_scene": "s6_choice_point"
    },

    {
      "scene_id": "s5_suspect_lawyers_up",
      "type": "narrative",
      "duration_seconds": 20,
      "background_illustration": "suspect_crossing_arms.png",
      "dialogue": [
        {
          "speaker": "suspect",
          "text": "I'm not saying another word without a lawyer.",
          "audio_url": "audio/det_s5c_suspect.mp3",
          "emotion": "shut_down"
        },
        {
          "speaker": "narrator",
          "text": "He's shutting down. Without a clear confrontation, he found a way out. The evidence is still there — but the moment slipped away.",
          "text_es": "Se está cerrando. Sin una confrontación clara, encontró una salida. La evidencia sigue ahí — pero el momento se escapó.",
          "audio_url": "audio/det_s5c_narrator.mp3"
        }
      ],
      "vocabulary_popup": {
        "trigger_phrase": "lawyer up",
        "popup_content": {
          "phrase": "to lawyer up",
          "meaning_es": "pedir un abogado y dejar de hablar",
          "native_mental_image": "Convertir 'lawyer' (abogado) en verbo: 'armarse de abogado'. El sospechoso se blinda. Es jerga de policías y series de crimen.",
          "real_usage": "'He lawyered up' = pidió abogado y se cerró. Cuando alguien hace esto, el interrogatorio se acaba. Inglés muy coloquial y moderno."
        }
      },
      "next_scene": "s6_choice_point"
    },

    {
      "scene_id": "s6_choice_point",
      "type": "extension_offer",
      "summary": {
        "vocabulary_learned": ["alibi", "suspect", "evidence", "come clean", "doesn't match"],
        "interactions_completed": 2,
        "naturalness_avg": null,
        "score": null
      },
      "next_options": [
        {
          "label_es": "Continuar el caso (5 min más)",
          "next_episode_branch": "detective_001_extended",
          "preview": "Reyes confesó que alguien le pagó. Ahora debes interrogar al segundo sospechoso — el curador del museo. Y este es mucho más listo..."
        },
        {
          "label_es": "Cerrar el caso y guardar progreso",
          "action": "save_and_exit"
        },
        {
          "label_es": "Repetir esta escena",
          "action": "replay_last_scene"
        }
      ]
    }
  ],

  "post_episode_review": {
    "words_to_remember": [
      {
        "word": "alibi",
        "context_in_story": "His alibi didn't hold up",
        "tip": "alibi = la historia de 'yo estaba en otro lado'. Cuando es débil: 'shaky alibi'. Cuando se confirma: 'the alibi checks out'."
      },
      {
        "word": "come clean",
        "context_in_story": "Why don't you come clean?",
        "tip": "come clean = confesar limpiándote de la mentira. Más humano que 'confess'."
      },
      {
        "word": "doesn't match",
        "context_in_story": "Your story doesn't match the evidence",
        "tip": "match = encajar, coincidir. 'Doesn't match up' = las piezas no cuadran. Frase clave de cualquier investigación."
      }
    ],
    "review_in_days": 3
  }
};

console.log('📚 Story Episodes loaded (princess_001, detective_001)');
