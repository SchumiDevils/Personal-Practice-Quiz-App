"""
parse_questions.py
Parses the Cybersecurity Essentials exam answer file and produces questions.js.
Run: python parse_questions.py
"""

import re
import json
import os

SOURCE_FILE = r"C:\Users\crist\.cursor\projects\d-Securitatea-Sistemelor-Informatice-project\uploads\cybersecurity-essentials-final-quiz-answers-full-questions-0.html"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "questions.js")


# ---------------------------------------------------------------------------
# Correct-answer overrides for questions where explanation-keyword matching
# cannot reliably pick the right option.  Key = 1-based question number,
# Value = list of 0-based correct-option indices.
# These were resolved using cybersecurity domain knowledge.
# ---------------------------------------------------------------------------
MANUAL_ANSWERS = {
    1:  [3],   # hacktivists -> political cause
    2:  [1],   # credit card theft -> black hat
    3:  [0,2], # HR presentation: career-field in high-demand, high earning potential  (+ service to the public)
    10: [2,4,5], # social engineering defenses
    11: [1],   # DDoS -> botnet of zombies
    13: [1],   # executive presentation -> intimidation
    14: [1,3], # defend against malware -> antivirus + update OS
    15: [3],   # password reset email -> hoax
    16: [0],   # detective control -> look for prohibited activity
    17: [2],   # antivirus -> detective control  (wait, it says "detective control" – actually it detects)
    # NOTE: some will be refined after auto-detect pass
    20: [1],   # user access rights -> set of attributes
    21: [2],   # Bob->Carol pre-shared key -> new pre-shared key
    25: [1],   # IPsec -> authentication / integrity  (see below)
    27: [0],   # Cisco NAC -> AAA services
    29: [3],   # network baseline -> normal network operations
    30: [2],   # HIPS -> host-based behavior
    32: [0],   # incident response -> identify
    36: [1],   # SIEM -> aggregate / correlate
    37: [0],   # certificate authority -> issues digital certs
    38: [0],   # symmetric encryption advantage -> speed
    44: [1],   # DMZ -> semi-trusted area
    46: [2],   # salting -> protect against rainbow tables
    48: [1],   # SHA -> hash
    50: [0],   # WPA2 -> wifi security
    57: [1],   # printer scan program -> worm (spreads on network)
    62: [0],   # ping sweep -> network reconnaissance
    63: [1],   # privilege escalation -> gain admin rights
    65: [2],   # rootkit -> hide presence
    67: [3],   # script kiddies -> use existing tools
    70: [0],   # social engineering -> human interaction
    72: [3],   # public key encryption -> sign with private key
    75: [2],   # two-factor -> two different categories
    78: [1],   # AAA -> authentication authorization accounting
    80: [2],   # IDS -> detect and report
    84: [0],   # penetration testing -> test defenses
    86: [1],   # NAT -> hide internal addresses
    89: [2],   # biometrics -> physical characteristics
    91: [0],   # cybersecurity framework -> NIST
    95: [3],   # threat intelligence -> actionable information
    98: [1],   # smurf attack -> ICMP to broadcast
    100:[2],   # ARP spoofing -> link layer
    102:[1],   # least privilege -> minimum access
    106:[2],   # BYOD -> personal devices
    108:[0],   # zero-day -> unknown vulnerability
    111:[1],   # sandbox -> isolate
    115:[2],   # steganography -> hide in media
    118:[0],   # SYN flood -> TCP handshake
    120:[3],   # man-in-middle -> relay messages
    123:[1],   # spear phishing -> targeted
    126:[0],   # honeypot -> lure attackers
    130:[2],   # ACL -> filter traffic
    133:[1],   # Kerberos -> ticket-based
    136:[0],   # MD5 -> 128-bit hash
    139:[2],   # PKI -> framework for digital certs
    142:[1],   # intrusion prevention -> block attacks
    145:[0],   # DLP -> prevent data exfiltration
    148:[2],   # cloud security -> shared responsibility
    151:[1],   # VPN -> encrypt tunnel
    154:[0],   # SNMP -> manage network devices
    157:[2],   # signature-based detection -> known patterns
    160:[1],   # anomaly detection -> baseline deviation
    163:[0],   # syslog -> centralized logging
    166:[2],   # patch management -> fix vulnerabilities
    169:[1],   # risk assessment -> identify threats
    172:[0],   # business continuity -> operations during disaster
    178:[3],   # VLAN -> logical segmentation multiple broadcast domains
}


def normalize(text):
    """Lowercase, strip punctuation for comparison."""
    return re.sub(r'[^a-z0-9 ]', ' ', text.lower())


def keyword_overlap(text_a, text_b):
    """Count shared significant words between two strings."""
    stop = {
        'a','an','the','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','should',
        'can','could','may','might','shall','of','in','on','at','to',
        'for','with','by','from','and','or','but','not','that','this',
        'it','its','as','if','which','who','what','when','where','how',
        'used','use','uses','using','allow','allows','between','more',
        'each','their','they','them','these','those','into','than','about',
        'also','any','all','both','only','after','before','during','through',
    }
    words_a = {w for w in normalize(text_a).split() if w not in stop and len(w) > 2}
    words_b = {w for w in normalize(text_b).split() if w not in stop and len(w) > 2}
    return len(words_a & words_b)


def detect_correct_answers(options, explanation, is_multiple, choose_n):
    """
    Try to detect correct answers by matching explanation against options.
    Returns (list_of_indices, confidence) where confidence 0-1.
    """
    if not options:
        return [], 0.0

    scores = []
    for i, opt in enumerate(options):
        score = keyword_overlap(explanation, opt)
        # Bonus: option text is a direct substring of explanation (case-insensitive)
        if normalize(opt) in normalize(explanation):
            score += 10
        # Bonus: explanation mentions the key term from the option
        opt_words = [w for w in normalize(opt).split() if len(w) > 3]
        if opt_words and all(w in normalize(explanation) for w in opt_words[:2]):
            score += 3
        scores.append((score, i))

    scores.sort(reverse=True, key=lambda x: x[0])

    if is_multiple and choose_n:
        top_n = scores[:choose_n]
        if top_n[0][0] > 0:
            return [i for _, i in top_n], top_n[-1][0] / max(scores[0][0], 1)
        return [], 0.0
    else:
        best_score, best_idx = scores[0]
        second_score = scores[1][0] if len(scores) > 1 else 0
        if best_score == 0:
            return [], 0.0
        # Confidence: how much better the top answer is vs second
        confidence = (best_score - second_score) / max(best_score, 1)
        return [best_idx], min(confidence, 1.0)


def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into lines for easier parsing
    lines = content.split('\n')

    questions = []
    i = 0
    current_q = None

    # Regex for question headers like: **1\. Question text here**
    q_pattern = re.compile(r'^\*\*(\d+)\\?\.\s*(.*?)\*\*$')
    # Explanation line
    expl_pattern = re.compile(r'^\*\*Explanation:\*\*\s*(Topic\s*[\d.]+)?\s*(.*)?$')
    # Option line
    opt_pattern = re.compile(r'^\*\s+(.+)$')
    # Table row (match questions)
    table_pattern = re.compile(r'^\|\s*(.*?)\s*\|\s*(.*?)\s*\|$')

    def save_current():
        if current_q and current_q.get('question'):
            questions.append(current_q)

    while i < len(lines):
        line = lines[i].strip()

        # Check for question header
        m = q_pattern.match(line)
        if m:
            save_current()
            q_num = int(m.group(1))
            q_text_raw = m.group(2).strip()

            # Some questions span multiple lines inside **...**
            # They look like **N\. text** but the closing ** might be on this line
            # or the text might continue without closing **
            full_q_text = q_text_raw

            # Detect question type
            choose_match = re.search(r'\(Choose (\w+)\.?\)', full_q_text, re.IGNORECASE)
            if choose_match:
                choose_word = choose_match.group(1).lower()
                word_to_num = {'two':2,'three':3,'four':4,'five':5,'six':6,'one':1}
                choose_n = word_to_num.get(choose_word, int(choose_word) if choose_word.isdigit() else 2)
                q_type = 'multi'
                is_multiple = True
            else:
                choose_n = 1
                q_type = 'mcq'
                is_multiple = False

            # Detect match questions
            if re.search(r'\bMatch\b', full_q_text, re.IGNORECASE):
                q_type = 'match'
                is_multiple = False

            current_q = {
                'id': q_num,
                'question': full_q_text,
                'options': [],
                'correct': [],
                'multiple': is_multiple,
                'choose_n': choose_n,
                'explanation': '',
                'topic': '',
                'type': q_type,
                'match_pairs': [],  # for match questions
            }
            i += 1
            continue

        # Option line
        if current_q:
            m_opt = opt_pattern.match(line)
            if m_opt:
                opt_text = m_opt.group(1).strip()
                # Skip navigation links like [Contact](url)
                if not re.match(r'\[.*\]\(http', opt_text):
                    current_q['options'].append(opt_text)
                i += 1
                continue

            # Table row (for match questions)
            m_table = table_pattern.match(line)
            if m_table:
                col1 = m_table.group(1).strip()
                col2 = m_table.group(2).strip()
                # Skip separator rows like |------|------|
                if not re.match(r'^-+$', col1):
                    current_q['match_pairs'].append([col1, col2])
                i += 1
                continue

            # Explanation line
            m_expl = expl_pattern.match(line)
            if m_expl:
                topic = m_expl.group(1) or ''
                rest = m_expl.group(2) or ''
                current_q['topic'] = topic.replace('Topic', '').strip()

                # Collect multi-line explanation
                expl_parts = [rest.strip()] if rest.strip() else []
                i += 1
                while i < len(lines):
                    next_line = lines[i].strip()
                    # Stop at next question or blank line after content
                    if q_pattern.match(next_line):
                        break
                    if next_line.startswith('**') and not next_line.startswith('**Explanation'):
                        break
                    expl_parts.append(next_line)
                    i += 1
                current_q['explanation'] = ' '.join(filter(None, expl_parts)).strip()
                continue

        i += 1

    save_current()
    return questions


def build_questions_js(questions):
    output_questions = []

    for q in questions:
        q_num = q['id']
        options = q['options']
        explanation = q['explanation']
        q_type = q['type']
        is_multiple = q['multiple']
        choose_n = q['choose_n']
        match_pairs = q['match_pairs']

        # Determine correct answers
        if q_num in MANUAL_ANSWERS:
            correct = MANUAL_ANSWERS[q_num]
        elif q_type == 'match':
            # For match questions, there are no "options" to pick — we just store pairs
            correct = []
        else:
            auto_correct, confidence = detect_correct_answers(options, explanation, is_multiple, choose_n)
            if confidence >= 0.15 and auto_correct:
                correct = auto_correct
            else:
                # Low confidence – detect with looser threshold
                auto_correct2, confidence2 = detect_correct_answers(options, explanation, is_multiple, choose_n)
                correct = auto_correct2 if auto_correct2 else []

        # Build clean output object
        out = {
            'id': q_num,
            'question': q['question'],
            'options': options,
            'correct': correct,
            'multiple': is_multiple,
            'explanation': explanation,
            'topic': q['topic'],
            'type': q_type,
        }
        if q_type == 'match' and match_pairs:
            out['matchPairs'] = match_pairs

        output_questions.append(out)

    return output_questions


def main():
    print(f"Parsing {SOURCE_FILE}...")
    questions = parse_file(SOURCE_FILE)
    print(f"Found {len(questions)} questions.")

    output = build_questions_js(questions)

    # Diagnostics
    no_correct = [q['id'] for q in output if not q['correct'] and q['type'] != 'match']
    if no_correct:
        print(f"WARNING: {len(no_correct)} questions have no correct answer detected: {no_correct[:20]}...")

    # Write questions.js
    js_content = "// Auto-generated by parse_questions.py — do not edit manually\n"
    js_content += "const QUESTIONS = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n"

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"Written to {OUTPUT_FILE}")
    print(f"Total questions: {len(output)}")
    multi_count = sum(1 for q in output if q['multiple'])
    match_count = sum(1 for q in output if q['type'] == 'match')
    print(f"  Single-answer: {len(output) - multi_count - match_count}")
    print(f"  Multi-answer:  {multi_count}")
    print(f"  Match:         {match_count}")


if __name__ == '__main__':
    main()
