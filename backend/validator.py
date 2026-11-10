"""
Lightweight, fast, fully local guard that catches *obviously* off-topic
messages before they're even sent to the model. This is a heuristic, not
a perfect classifier — its job is to save a wasted model call on clearly
unrelated questions ("write me a Python script", "what's the weather"),
while never blocking anything that might legitimately be a language
question. The system prompt is the main line of defense for anything
subtler; this is a cheap first filter.

How it works:
1. If the message contains any Arabic or CJK (Chinese) characters at all,
   it's almost certainly language-related -> ALLOW.
2. If the message contains any of a broad set of language-learning
   keywords (in English, Arabic, or Chinese) -> ALLOW.
3. If the message contains any of a short list of clearly unrelated
   topic keywords AND none of the above -> BLOCK.
4. Otherwise (ambiguous / short / unclear) -> ALLOW, and let the model's
   system prompt handle the refusal if needed. We'd rather let a few
   edge cases through to the model than block a real question.
"""

import re

ARABIC_RANGE = re.compile(r"[\u0600-\u06FF\u0750-\u077F]")
CJK_RANGE = re.compile(r"[\u4E00-\u9FFF\u3400-\u4DBF]")

LANGUAGE_KEYWORDS = [
    # English
    "translate", "translation", "pinyin", "mandarin", "chinese", "arabic",
    "grammar", "vocabulary", "vocab", "meaning", "sentence", "correct",
    "character", "hanzi", "汉字", "tone", "pronunciation", "word for",
    "how do you say", "what does", "mean in", "learn chinese", "learn arabic",
    "i'rab", "irab", "dialect", "writing system", "arabic script", "chinese script",
    "calligraphy", "idiom", "proverb",
    "measure word", "particle", "classifier", "radical", "stroke order",
    # Arabic
    "ترجم", "ترجمة", "معنى", "كلمة", "جملة", "قواعد", "تصحيح", "نطق",
    "لغة", "صيني", "عربي", "حرف", "حروف", "نحو", "صرف", "إعراب",
    # Chinese
    "翻译", "意思", "语法", "词汇", "纠正", "发音", "汉语", "阿拉伯语",
    "拼音", "汉字", "句子", "单词", "语言",
]

# Short, deliberately conservative list — topics that are unambiguous and
# have zero overlap with language-learning context.
OFF_TOPIC_KEYWORDS = [
    "python script", "write code", "javascript function",
    "debug this code", "sql query", "weather today", "weather forecast",
    "stock price", "football score", "football match", "recipe for",
    "how to cook", "math problem", "solve for x", "calculate the",
    "who won the election", "current news", "latest news",
    "medical advice", "diagnose", "symptoms of", "legal advice",
    "write my essay", "write a poem about", "relationship advice",
]


def is_on_topic(message: str) -> bool:
    """Return True if the message should be sent to the model."""
    if not message or not message.strip():
        return True  # let empty/short messages pass through, model will ask for clarification

    text = message.lower()

    if ARABIC_RANGE.search(message) or CJK_RANGE.search(message):
        return True

    if any(keyword in text for keyword in LANGUAGE_KEYWORDS):
        return True

    if any(keyword in text for keyword in OFF_TOPIC_KEYWORDS):
        return False

    # Ambiguous case: let it through, rely on the system prompt.
    return True


REFUSAL_MESSAGES = {
    "ar": (
        "أنا لغتي 语伴 المتخصص في اللغتين العربية والصينية فقط 🌙. "
        "جرّب أن تسألني عن ترجمة، مفردة، قاعدة نحوية، أو تصحيح جملة بالعربية أو الصينية."
    ),
    "zh": (
        "我是 Lingua 语伴，专注于中文和阿拉伯语的学习助手 🌙。"
        "欢迎向我提问翻译、词汇、语法或句子纠正方面的问题。"
    ),
    "en": (
        "I'm Lingua 语伴, a specialized Arabic-Chinese language assistant 🌙. "
        "Ask me about translation, vocabulary, grammar, or sentence correction "
        "in Arabic or Chinese!"
    ),
}


def get_refusal_message(ui_language: str) -> str:
    return REFUSAL_MESSAGES.get(ui_language, REFUSAL_MESSAGES["en"])
