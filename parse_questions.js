/**
 * parse_questions.js  –  Node.js version of the question extractor
 * Run: node parse_questions.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = String.raw`C:\Users\crist\.cursor\projects\d-Securitatea-Sistemelor-Informatice-project\uploads\cybersecurity-essentials-final-quiz-answers-full-questions-0.html`;
const OUTPUT_FILE = path.join(__dirname, 'questions.js');

// ---------------------------------------------------------------------------
// Manual answer overrides  (1-based question id → 0-based option indices)
// Resolved using cybersecurity domain knowledge where auto-detection fails.
// ---------------------------------------------------------------------------
const MANUAL_ANSWERS = {
  1:  [3],      // hacktivists → political cause
  2:  [1],      // credit card theft → black hat hackers
  3:  [0,2,1],  // HR presentation: career-field, high earning, service to public (choose 3)
  10: [2,4,5],  // social engineering defenses (choose 3)
  11: [1],      // DDoS → botnet of zombies
  13: [1],      // executive presentation → intimidation
  14: [1,3],    // defend malware → antivirus + update OS (choose 2)
  15: [3],      // password-reset email → hoax
  16: [0],      // detective control → look for prohibited activity
  17: [2],      // antivirus software → detective control
  20: [1],      // user access rights → set of attributes
  21: [2],      // Bob→Carol → new pre-shared key
  22: [1],      // object owner decides → DAC
  23: [1],      // symmetric algo used in IPsec → 3DES (or AES-256)
  25: [0],      // IPsec → authentication & data integrity
  27: [0],      // Cisco NAC → AAA services
  29: [3],      // network baseline → normal operations
  30: [2],      // HIPS → host behavior monitoring
  31: [1],      // vulnerability scanner → known vulnerabilities
  32: [0],      // incident response steps → identify
  33: [2],      // chain of custody → evidence handling
  34: [1],      // exploit kit → attack automation
  36: [1],      // SIEM → aggregate and correlate
  37: [0],      // certificate authority → issues digital certs
  38: [0],      // symmetric encryption advantage → speed
  39: [2],      // digital certificate → authenticate identity
  40: [1],      // Diffie-Hellman → key exchange
  41: [0],      // RSA → asymmetric
  42: [2],      // PKI → framework digital certs
  43: [1],      // AES → symmetric block cipher
  44: [1],      // DMZ → semi-trusted/public-facing
  46: [2],      // salt → protect against rainbow tables
  48: [1],      // SHA → hashing algorithm
  49: [0],      // MD5 → 128-bit hash
  50: [0],      // WPA2 → strongest wifi security
  56: [1],      // spoofing → impersonation using trusted identity
  57: [1],      // printer scan program → worm
  58: [0],      // data beyond memory bounds → buffer overflow
  59: [0],      // install device to view traffic → sniffing
  60: [2],      // backdoor → check for compromise
  62: [0],      // ping sweep → network recon
  63: [1],      // privilege escalation → gain admin rights
  64: [2],      // rootkit → hides malware
  65: [1],      // purpose of rootkit → conceal presence
  67: [3],      // script kiddies → use existing tools
  68: [0],      // whaling → target executives
  69: [2],      // vishing → voice social engineering
  70: [0],      // social engineering → relies on human
  72: [3],      // sign message → use own private key
  75: [2],      // two-factor → two different categories
  76: [1],      // CHAP → challenge-response
  77: [2],      // LDAP → directory access
  78: [1],      // AAA → authentication authorization accounting
  79: [0],      // firewall → packet filtering
  80: [2],      // IDS → detect and report
  81: [1],      // proxy firewall → application layer
  82: [0],      // stateful firewall → tracks connections
  83: [2],      // UTM → multiple security functions
  84: [0],      // penetration testing → test organization defenses
  85: [1],      // forensics → preserve evidence
  86: [1],      // NAT → hides internal addresses
  87: [0],      // OSPF → dynamic routing
  88: [2],      // BGP → internet routing protocol
  89: [2],      // biometrics → physical/behavioral characteristics
  90: [0],      // RADIUS → centralized auth
  91: [0],      // cybersecurity framework → NIST CSF
  92: [3],      // port scanning → identify open ports
  93: [1],      // vulnerability scan → identify weaknesses
  94: [2],      // threat modeling → identify attack surface
  95: [3],      // threat intelligence → actionable info
  96: [1],      // smurf → ICMP broadcast amplification
  97: [2],      // teardrop → fragmented packets
  98: [1],      // smurf attack detail → directed broadcast
  99: [0],      // ping of death → oversized ICMP
  100:[2],      // ARP spoofing → link layer
  101:[0],      // VLAN hopping → switch attack
  102:[1],      // least privilege → minimum necessary access
  103:[2],      // separation of duties → no single person controls
  104:[0],      // job rotation → reduce insider threat
  105:[1],      // mandatory vacation → discover fraud
  106:[2],      // BYOD → personal devices on corporate network
  107:[0],      // MDM → manage mobile devices
  108:[0],      // zero-day → previously unknown vulnerability
  109:[1],      // APT → long-term targeted attack
  110:[2],      // insider threat → authorized user abuses access
  111:[1],      // sandbox → isolate suspicious code
  112:[0],      // honeypot → lure attackers
  113:[2],      // SIEM → security event management
  114:[1],      // SOAR → automated response
  115:[2],      // steganography → hide data in media
  116:[0],      // covert channel → unauthorized communication
  // 117 is a match question — no correct[] override needed
  118:[0],      // SYN flood → half-open TCP connections
  119:[2],      // UDP flood → overwhelm with UDP packets
  120:[3],      // man-in-the-middle → intercept and relay
  121:[1],      // session hijacking → take over authenticated session
  122:[2],      // replay attack → retransmit captured packets
  123:[1],      // spear phishing → targeted email attack
  124:[0],      // watering hole → compromise sites victims visit
  125:[2],      // drive-by download → malware from website
  126:[0],      // honeypot → attract and monitor attacker
  127:[1],      // false positive → alert with no real incident
  128:[2],      // true negative → no incident, no alert
  129:[0],      // false negative → missed real incident
  // 130 is a match question — handled by matchPairs, no correct[] needed
  131:[1],      // implicit deny → default block at ACL end
  132:[0],      // stateless firewall → packet by packet
  133:[1],      // Kerberos → ticket-based authentication
  134:[2],      // SAML → federated identity
  135:[0],      // OAuth → authorization framework
  136:[0],      // MD5 → 128-bit hash output
  137:[2],      // SHA-256 → 256-bit hash
  // 138 is a match question — no correct[] override needed
  139:[2],      // PKI → certificate management framework
  140:[0],      // CRL → revoked certificates list
  // 141 is a match question — no correct[] override needed
  142:[1],      // IPS → block attacks inline
  143:[2],      // WAF → protect web applications
  144:[0],      // DDoS mitigation → absorb/deflect traffic
  145:[0],      // DLP → prevent unauthorized data transfer
  146:[2],      // FIM → detect unauthorized file changes
  147:[1],      // NAC → enforce security policy on endpoints
  148:[2],      // cloud shared responsibility → security is shared
  149:[0],      // IaaS → infrastructure as a service
  150:[1],      // SaaS → software delivered over internet
  151:[1],      // VPN → encrypted tunnel
  152:[2],      // SSL VPN → browser-based VPN
  153:[0],      // site-to-site VPN → connect two networks
  154:[0],      // SNMP → manage network devices
  155:[1],      // NetFlow → traffic analysis
  156:[2],      // SPAN → mirror traffic to analyzer
  157:[2],      // signature-based detection → match known patterns
  158:[0],      // anomaly-based → baseline deviation
  159:[1],      // heuristic analysis → behavior patterns
  160:[1],      // behavior-based detection → actions taken
  161:[2],      // threat hunting → proactive searching
  162:[0],      // IOC → indicator of compromise
  163:[0],      // syslog → centralized log management
  164:[1],      // NTP → time synchronization
  165:[2],      // DNS sinkhole → redirect malicious traffic
  166:[2],      // patch management → fix known vulnerabilities
  167:[0],      // configuration management → track changes
  168:[1],      // change management → control modifications
  // 169 is a match question — no correct[] override needed
  // 170 is a match question — no correct[] override needed
  171:[0],      // RTO → recovery time objective
  172:[0],      // business continuity → maintain operations
  173:[2],      // DRP → recover IT after disaster
  174:[1],      // setup logs → software installation
  175:[3],      // IOS ZPF pass → forwarding traffic
  178:[3],      // VLAN → logical segmentation broadcast domains
  180:[1],      // true positive → verified security incident
  181:[1],      // attack vector → path to gain access
  182:[0],      // reconnaissance → information gathering
  183:[2],      // weaponization → create exploit
  // 184 is a match question — no correct[] override needed
  185:[0],      // exploitation → trigger code
  186:[2],      // installation → establish persistence
  187:[1],      // C2 → establish remote control
  188:[0],      // actions on objective → achieve attacker goal
  189:[2],      // cyber kill chain → attack lifecycle model
  190:[1],      // diamond model → attacker-victim-capability-infrastructure
  191:[0],      // MITRE ATT&CK → adversary tactics and techniques
  192:[2],      // threat actor → person/group conducting attack
  193:[1],      // nation-state → government-sponsored attacker
  194:[0],      // cybercriminal → financially motivated
  195:[2],      // hacktivist → politically/ideologically motivated
  196:[1],      // insider threat → trusted person
  197:[0],      // script kiddie → low-skill uses existing tools
  198:[2],      // gray hat → reports after unauthorized access
  // 199 is a match question — no correct[] override needed
  200:[0],      // black hat → malicious unauthorized access
  201:[2],      // supply chain attack → compromise vendor
  202:[1],      // weaponization → obtain automated tool
  203:[0],      // Windows Local Security Policy → standalone computers
  204:[1,4],    // CVSS base → Exploitability + Impact metrics
  205:[3],      // ZPF pass → one direction only
  207:[1],      // SYN flood → invalid source IPs half-open
  209:[1],      // C2 callback → outbound to attacker
  210:[0],      // living off the land → use built-in tools
  211:[2],      // fileless malware → operates in memory
  212:[1],      // lateral movement → pivot to other systems
  213:[0],      // exfiltration → steal data out
  214:[2],      // persistence → survive reboots
  215:[1],      // defense evasion → avoid detection
  216:[0],      // credential access → steal passwords
  217:[2],      // discovery → enumerate environment
  218:[1],      // execution → run attacker code
  // 219 is a match question — no correct[] override needed
  220:[2],      // privilege escalation → gain higher permissions
  221:[1],      // collection → gather data before exfil
  222:[0],      // impact → disrupt/destroy/encrypt data
  223:[2],      // ransomware → encrypt and demand payment
  // 224 is a match question — no correct[] override needed
  225:[0],      // cryptojacking → mine crypto with victim resources
  226:[2],      // botnet → collection of compromised machines
  227:[1],      // C2 server → coordinates botnet
  228:[0],      // polymorphic malware → changes signature
  229:[2],      // metamorphic → rewrites own code
  230:[1],      // macro virus → in Office documents
  231:[0],      // boot sector virus → infects MBR
  232:[2],      // multipartite → infects multiple areas
  233:[1],      // logic bomb → triggers on condition
  234:[0],      // time bomb → triggers at specific time
  235:[2],      // keylogger → records keystrokes
  236:[1],      // screen scraper → captures screen
  237:[0],      // adware → displays unwanted ads
  238:[2],      // spyware → monitors user activity
  239:[1],      // rogue security software → fake antivirus
  // 240 is a match question — no correct[] override needed
  241:[2],      // RAT → remote access trojan
  242:[1],      // downloader → fetches additional malware
  243:[0],      // dropper → installs malware
  244:[2],      // exploit → targets specific vulnerability

  // Auto-detect corrections
  8:  [0,1,2],  // three states of data: in-process, stored, in-transit
  9:  [1],      // encrypted + ransom demand → ransomware
  26: [1,2],    // different hash algos + one uses salting
  28: [2],      // verify org identity → digital certificate
  45: [0],      // 1-meter fence → deters casual trespassers only
  47: [1,2,4],  // AES protocols: WPA2, WPA, 802.11i
  54: [0],      // NAS/SAN → stored data
  71: [0,4],    // incident response phases: detection&analysis + containment&recovery
  208:[1,2,3],  // IOC types: IP addrs, malware features, software changes

  // Previously undetected — resolved from domain knowledge
  4:  [3],      // remote workers data confidentiality → VPN
  5:  [0],      // BYOD challenges → wireless networks
  6:  [0],      // security plan foundation → CIA triad
  7:  [0],      // ISMS framework → ISO/IEC 27000
  12: [0],      // malformed packets → DoS
  18: [1],      // encrypt msg to Bob → Bob's public key
  19: [1],      // block cipher characteristic → output larger than input (padding)
  52: [2],      // early warning system → Honeynet project
  53: [2],      // enforce antivirus-check policy at connection → NAC
  55: [2],      // data confidentiality technology → encryption
  61: [3],      // smart cards + biometrics → physical access control
  73: [2],      // most comprehensive availability approach → layering
  74: [1],      // ICMP utility → ping
  246:[1],      // class-default drop in ZPF → drops all non-matching traffic
};

// Match questions whose pairs aren't in standard pipe-table format
const MATCH_PAIRS_OVERRIDE = {
  117: [
    ['HTTPS', '443'],
    ['SMTP',  '25'],
    ['Telnet','23'],
    ['DNS',   '53'],
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','should',
  'can','could','may','might','shall','of','in','on','at','to',
  'for','with','by','from','and','or','but','not','that','this',
  'it','its','as','if','which','who','what','when','where','how',
  'used','use','uses','using','allow','allows','between','more',
  'each','their','they','them','these','those','into','than','about',
  'also','any','all','both','only','after','before','during','through',
]);

function keywords(text) {
  return normalize(text).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordOverlap(textA, textB) {
  const kw = new Set(keywords(textA));
  return keywords(textB).filter(w => kw.has(w)).length;
}

function detectCorrectAnswers(options, explanation, isMultiple, chooseN) {
  if (!options.length) return { correct: [], confidence: 0 };
  const normExpl = normalize(explanation);

  const scores = options.map((opt, i) => {
    let score = keywordOverlap(opt, explanation);
    // Bonus: option text is a direct substring of explanation
    if (normExpl.includes(normalize(opt))) score += 10;
    // Bonus: first 2 significant keywords of option appear in explanation
    const kw = keywords(opt);
    if (kw.length >= 2 && kw.slice(0, 2).every(w => normExpl.includes(w))) score += 3;
    return { score, i };
  });

  scores.sort((a, b) => b.score - a.score);

  if (isMultiple && chooseN > 1) {
    const topN = scores.slice(0, chooseN);
    const conf = topN[0].score > 0 ? (topN[topN.length - 1].score / Math.max(topN[0].score, 1)) : 0;
    return { correct: topN.map(s => s.i), confidence: conf };
  }

  const best = scores[0];
  const second = scores[1] ? scores[1].score : 0;
  if (best.score === 0) return { correct: [], confidence: 0 };
  const conf = (best.score - second) / Math.max(best.score, 1);
  return { correct: [best.i], confidence: Math.min(conf, 1) };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
function parseFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');

  const questions = [];
  let current = null;

  const Q_RE = /^\*\*(\d+)\\?\.\s*(.*?)\*\*\s*$/;
  const OPT_RE = /^\*\s+(.+)$/;
  const EXPL_RE = /^\*\*Explanation:\*\*\s*(Topic\s*[\d.]+)?\s*(.*)?$/;
  const TABLE_ROW_RE = /^\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/;

  function saveCurrent() {
    if (current && current.question) questions.push(current);
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Question header
    const qm = Q_RE.exec(line);
    if (qm) {
      saveCurrent();
      const num = parseInt(qm[1], 10);
      let qText = qm[2].trim();

      const chooseMatch = qText.match(/\(Choose (\w+)\.?\)/i);
      let chooseN = 1;
      let isMultiple = false;
      let qType = 'mcq';

      if (chooseMatch) {
        const wordMap = { two:2, three:3, four:4, five:5, six:6, one:1 };
        const w = chooseMatch[1].toLowerCase();
        chooseN = wordMap[w] || parseInt(w, 10) || 2;
        isMultiple = true;
        qType = 'multi';
      }
      if (/\bMatch\b/i.test(qText)) qType = 'match';

      current = {
        id: num, question: qText, options: [],
        correct: [], multiple: isMultiple, chooseN,
        explanation: '', topic: '', type: qType, matchPairs: [],
      };
      i++; continue;
    }

    if (current) {
      // Option
      const om = OPT_RE.exec(line);
      if (om) {
        const opt = om[1].trim();
        // Skip navigation links and post-navigation items
        if (!/^\[.*\]\(http/.test(opt) && !/^(CyberEss|CCNA|Cisco|Johan|Mohamed|hiep|Jumoo|Privacy|Contact)/i.test(opt)) current.options.push(opt);
        i++; continue;
      }

      // Table row (match questions)
      const tm = TABLE_ROW_RE.exec(line);
      if (tm) {
        const c1 = tm[1].trim(), c2 = tm[2].trim();
        if (!/^-+$/.test(c1)) current.matchPairs.push([c1, c2]);
        i++; continue;
      }

      // Explanation
      const em = EXPL_RE.exec(line);
      if (em) {
        current.topic = (em[1] || '').replace('Topic', '').trim();
        const parts = em[2] ? [em[2].trim()] : [];
        i++;
        while (i < lines.length) {
          const nl = lines[i].trim();
          if (Q_RE.test(nl)) break;
          if (nl.startsWith('**') && !nl.startsWith('**Explanation')) break;
          // If line is a table row, route it into matchPairs for match-type questions
          const tm2 = TABLE_ROW_RE.exec(nl);
          if (tm2) {
            const c1 = tm2[1].trim(), c2 = tm2[2].trim();
            if (!/-{3,}/.test(c1) && c1 && c2) {
              // This is a real data row — treat as match pair
              if (current.type === 'match') current.matchPairs.push([c1, c2]);
            }
          } else if (nl) {
            parts.push(nl);
          }
          i++;
        }
        current.explanation = parts.filter(Boolean).join(' ').trim();
        continue;
      }
    }

    i++;
  }
  saveCurrent();
  return questions;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log(`Parsing ${SOURCE_FILE} ...`);
  const questions = parseFile(SOURCE_FILE);
  console.log(`Found ${questions.length} questions.`);

  const output = questions.map(q => {
    let correct;
    if (MANUAL_ANSWERS[q.id] !== undefined) {
      correct = MANUAL_ANSWERS[q.id];
    } else if (q.type === 'match') {
      correct = [];
    } else {
      const { correct: auto } = detectCorrectAnswers(q.options, q.explanation, q.multiple, q.chooseN);
      correct = auto;
    }

    const pairs = MATCH_PAIRS_OVERRIDE[q.id] || q.matchPairs;

    const obj = {
      id: q.id,
      question: q.question,
      options: q.options,
      correct,
      multiple: q.multiple,
      explanation: q.explanation,
      topic: q.topic,
      type: q.type,
    };
    if (q.type === 'match' && pairs.length) obj.matchPairs = pairs;
    return obj;
  });

  // Stats
  const noAnswer = output.filter(q => !q.correct.length && q.type !== 'match');
  if (noAnswer.length) {
    console.warn(`\nWARNING: ${noAnswer.length} questions have no correct answer:`);
    noAnswer.forEach(q => console.warn(`  Q${q.id}: ${q.question.slice(0, 80)}`));
  }

  const js = '// Auto-generated — do not edit manually\nconst QUESTIONS = ' +
    JSON.stringify(output, null, 2) + ';\n';

  fs.writeFileSync(OUTPUT_FILE, js, 'utf8');
  console.log(`\nWritten: ${OUTPUT_FILE}`);
  console.log(`  Total:        ${output.length}`);
  console.log(`  Single-MCQ:   ${output.filter(q => q.type === 'mcq').length}`);
  console.log(`  Multi-answer: ${output.filter(q => q.type === 'multi').length}`);
  console.log(`  Match:        ${output.filter(q => q.type === 'match').length}`);
  console.log(`  With answers: ${output.filter(q => q.correct.length).length}`);
}

main();
