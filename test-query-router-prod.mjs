/**
 * Production Query Router Test Script
 * 
 * Tests the Smart Query Router against production Firebase database
 * Authenticates, runs 3 test scenarios, and exports results to markdown
 * 
s.json
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'fireba;
import { getFirestore, co
import { GoogleGenerativeAI } from '@';


// Firebase config from v
const firebaseConfig = {
  apiKey: 'AIzaSyBt1JoukjkIGvFhvEvf5B648QrvR41uKS
  authDomain: 'first-aid-101112.
  projectId: 'first-aid-101112',
  storageBucket: 'first-aid-101112.f.app',
  messagingSenderId: '162068922013',
  44a1e74'


xIs';

// Initialize Firebase
const app = initializeApp(nfig);
const auth = getAuth(app);
app);

// Initialize Gemini
;

// Test scenarios
con= [
  {
    number: 1,
    name: 'Simple Query (Direct Database Lookup)',
    query: 'Show me all cr4',
    
  },
  {
    number: 2,
    name: 'Complex Query (AI Analysis with RAG)',
    query: 'What are the ma',
    mplex'
  }
  {
    number: 3,
    name: 'Hybrid Query (Database + AI Analysis)',
    query: 'List all open e',
   
  


// Query Classification Ler.ts)
const SIMPLE_PATTERNS = [
  /\b(show|list|find|get|display|give me|what are)\b.,
  /\bhow many\b.*\b(findings?|issui,
  /\b(in|from|during)\s+\d{4}\b/i,
  /\b(critical|high|medium|low)\s+(priority|severity|findings?|issues?)\b/i,
  ,
];

const COMPLEX_PATTERNS = [
  /\b(what|why|how)\s+should\b/i,
  /\b(recommend|suggest|advise|propo
  /\b(analyze|analysis|analyse)\b/i,
  /\b(patterns?|trends?|tendenc(y|ies))\b/i
  /\b(compare|comparison|versus|vs\.?)\b/i,
  /\b(prioritize|priority|important|focus|urg
  /\b(insights?|conclusions?|takeaways?)\b/i,
  /\b(improve|improvement|better|optimize)\b/i,
  /\b(summary|summarize|summarise|overview)\b/i,
  


const HYBRID_PATTERNS = [
  /\b(show|list|find|get)\b.*\b(and|then)\b.*\b(explain|analyze|s
  /\b(findings?|issues?)\b.*\b(and|then)\b.*\b(what|why|how)\b/i,
  b/i,
];

function calculatePat) {
  let matchCount = 0;
  
  
  for (const pattern of patterns) {
    const match );
    if (match) {
      matchCount++;
      const matchWeight = match[0].length / query.
     ;
    }
  }
  
   0;
  
  const countScore = Math.min(matchCount / 3, 1);
  
  
 ;


function classifyQuery(query) {
  ;
  
  const simpleScore = calculatePatternScore(normalizedQuery, SIMPLE_PATTERNS);
  const complexScore = calculatePatternScore(normalizedQuery, COMPLEX_PATTERNS
  TTERNS);
  
  // Extract filters
  
  
  // Year
  const yearMatch = query.match(/\b(20\d{2})\b/);
  
  
  // Severity
  if (/critical/i.test(query)) filters.severity = ['Criical'];
  
  
  // Status
  if (/open/i.test(query)) filters.status = ['Open'];
  ed'];
  
  // Project type
  if (/hotel/i.test(query)) filters.projectType = 'Hotel';
  l';
  
  // Determine type
  
  
  if (hybridScore > 
    type = 'hybrid';
    confidence = Math.min(hybridScore + 0.2, 1);
  } else if (simpleS) {
    type = 'hybrid';
    confidence = Math.min((simpleScore + c);
  } else if (complexS
    type = 'complex';
    confidence = Math.min(compl);
  } else if (simpleS> 0) {
    type = 'simple';
    confid;
  } else {
    type = 'complex';
   ;
  }
  
  // Fallback rule
  ex';
  
 ;
}

async fters) {
  try {
    let q = collection(db, ings');
    ];
    
    if (filters.year) {
     );
    }
    if (filters.severity) {
     ;
    }
    if (filters.status) {
     );
    }
    if (filters.projectType) {
     ;
    
    
    ));
    
    if (constraints.length > 0) {
     
    
    
    const snapshot = awa;
     [];
    
    snapshot.forEach(doc => {
      f
    ;
    
    return findings
  } catch (error) {
    console.er
    [];
 }
}

async f {
  try {
    ;
    
    const context = findings.slice(0, 10).map(f => 
      `- [${f.sev
    
    


}

y}

Provces).`;
    
    const result = await model.generateContmpt);
    const response = await 
    return response);
  } catch (error) {
    console.error('⚠️  AI analysis error:', error.message);
   
  }
}

function formatResults(scenario, classi
  let output = `\n${'='.repeat(80)}\n`;
  output += `SCENARIO ${scenario.num\n`;
  
  
  \n`;
  
  output += `CLASSIFICATION:\n`;
  output += `  Type: ${classification.type}\n`;
  output += `  Confidence: ${(classification.confiden;
  output += `  Expected: ${scenario.expectedType}\n`;
  output += `  Match: ${classification.type === scenario.expectedType ?\n`;
  \n`;
  output += `    - Simple: )}%\n`;
  output += `    - Complex: ${(classification.scores.
  output += `    - Hybrid: ${(classification.scores.hybridS
  \n`;
  
  output += `EXECUTION:\n`;
  output += `  Execution Time: ${executionTime
  output += `  Findings Retrieved: ${findings.length}\n\n`;
  
  if (f
    output += `SAMP`;
    => {
  ;
      output += `  
    });
    output += `\n`;
  }e {
  n`;
  }
  
sis) {
    output += `AI ANALYSIS:\n`;
    output += `  ${aiAnalysis.replace(/)}\n\n`;
  }
  
  ret
}

function loadCredentials() {
  try {
    const data = fstf8');
    return JSON.parse(data);
  } catch {
    con);
    c');
 
",');
    console.error('     "pa"');
    console.error('   }');
    process.exit(1);
  }
}

async function runTests() {
  n');
  conso);
  console.log('Connecting to Firebase production database...');
  
  // Load credentias
  const credentials = loadCredentials();
  console.log(`📧 Us\n`);
  
  
  try {
    await signInWithEmailAndPassword(auth, credentials.email, credenti
    console.log('✅ Authenticated successfully\n');
  } catch (error) {
    console.error('❌ Authenticsage);
  ls.json');
    process.exit(1);
  }
  
  let markdownOutput = `# Smart Query Rout\n`;
  markdownOutput += `**Test Date:** ${new Date().toLocaleStr`;
  ma
  markdownOutput += `**User:** ${\n\n`;
  ma
  
  let terminalOutput = '';
  le;
  
  // Run each test scenario
  fo) {
    console.log(`Running Scenario ${sc
    
    const startTime = Date.now();
    
    // Step 1: Classify
    cony);
    c);
    
    // Step 2: Query database
    lters);
    console.log(`  ✓ `);
    
    // Step 3: AI analysis (i
    let aiAnalysis = null;
    rid') {
      if (findings.length > 0) {
   `);
  s);
        console.log(` );
      }
  
    
    const executionTime = Date.now() - sta
    
    // Check if classification matches expected
    if (classification.type !== scenario.expectedType) {
      allPassed = false;
      console.log(`  ⚠️  Classification mismatch: expected ${scenario.expe
    }
    
  lts
    const output = formatResults(scenario, classification, findings, aiAnalysis, executionTime);
   output;
    markdownOutput += output;
    
    console.log(`✅ Scen);
  }
  
  // Print to terminal
 at(80));
ULTS');
  console.log('=);
  console.log(terminalOutput);
  
  // Summary
  c

});
(1);exitss. proce;
 rror):', eal error'❌ Fatrror(sole.e {
  con =>catch(errors().ts
runTesttes/ Run the ;
}

/ame}\n`)en to ${filortedxpts eesulg(`📄 Rle.lo  consotput);
wnOu, markdoilenameleSync(ffs.writeFi
  md';RESULTS.D-TEST-Y-ROUTER-PROname = 'QUERfilen
  const to markdow  // Export 
  
tion\n\n`;s integra AI analysi. ✓ut += `  4downOutp
  mark\n`;iltersng with fbase queryi  3. ✓ Datat += `nOutpuowrkd;
  maguage\n`l lanuranataction from Filter extr += `  2. ✓ utputdownO\n`;
  mark/hybrid)lex/comp (simpleicationlassif✓ Query c= `  1. t +arkdownOutpug:\n`;
  mis workingic outer loQuery RThe Smart  += `utrkdownOutp}
  
  ma\n`;
  itivity\n senschingtern mat to pat be duehis mayt += `   TnOutpu markdow
   n`;cted types\ match expeotations did nicome classif  S += `⚠️Outputdownmarkse {
    ;
  } eles\n\n`d typtetched expeccations masifias= `✅ All clnOutput +
    markdow;ssfully!\n`sted succearios te All 3 scen `✅tput +=  markdownOud) {
  asse (allP if
 \n\n`;
  repeat(80)}{'='. `$ +=wnOutput
  markdoRY\n`; += `SUMMArkdownOutput\n`;
  ma(80)}repeat'.`\n${'=t += arkdownOutpu  
  mog();
le.l);
  consoration's integ✓ AI analysi.log('  4. onsolers');
  cteing with filse query ✓ Databaog('  3.nsole.l
  coe');l languagom naturaion frer extract. ✓ Filtog('  2ole.l');
  conshybrid)complex/simple/ion (ficatuery classi Qog('  1. ✓nsole.lng:');
  coworkic is logiy Router rt Quermae.log('The S
  consol);log(  console.}
  
ity');
  ivhing sensitatc matternue to ps may be dog('   Thiole.l
    consd types');xpecte ematchid not ns dssificatio cla('⚠️  Some.log    consolese {

  } el types');expectedched ions matatl classific✅ Al.log('nsole');
    coully! successfarios testedll 3 sceng('✅ Alo console.) {
   allPassedf (
  
  i);g(le.loso);
  conat(80)og('='.repe console.l;
 UMMARY')ole.log('S  cons