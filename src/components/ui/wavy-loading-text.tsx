import { useEffect, useState, useRef } from 'react';

const WAITING_MESSAGES = [
  "Fetching your audit findings...",
  "Tail wagging, brain working...",
  "Digging through the findings database...",
  "Good boy doing good work. One moment...",
  "Sit. Stay. Analyzing...",
  "On the scent. Almost there...",
  "Connecting the dots... and the paw prints",
  "Ears perked. Processing...",
  "Retrieving. It's literally what I do.",
  "Who's a good auditor? Thinking...",
  "Bernard is on it. No treat necessary.",
  "Chewing on this one...",
  "Alert and focused. Give me a sec...",
  "Nosing through the database...",
  "Fetching results... and not a tennis ball this time",
  "Paws on keyboard. Almost done...",
  "Off-leash in the findings database...",
  "Rolling over your request...",
  "Doing a walkthrough. The audit kind.",
  "Hunting down that answer like a bone in the yard...",
  "Unleashed on your audit data...",
  "Looking at this from every angle...",
  "Bernard never bites. But he does audit.",
  "Pawing through the database...",
  "Almost there. Good things take a few seconds...",
  "Compiling your audit intelligence...",
  "Loading context from the findings database...",
  "Digging a little deeper...",
  "Reading every finding. Yes, all of them...",
  "Putting the pieces together...",
  "Following the trail...",
  "Tracking repeat findings...",
  "Pulling findings for you...",
  "Scanning the database...",
  "Digging up findings from prior years...",
  "Almost got it. Hold on...",
  "Cross-referencing the data...",
  "Flagging the repeat offenders...",
  "Spotting patterns in the findings...",
  "Comparing across years...",
  "Working through the data...",
  "Crunching the numbers...",
  "Running through the findings...",
  "Checking the records...",
  "Sorting through everything...",
  "Tracing findings across the database...",
  "One moment, nose to the ground...",
  "Following the trail...",
  "Processing your request, no belly rubs needed...",
  "Hold tight, Bernard's on the case..."
];

interface WavyLoadingTextProps {
  className?: string;
  loadingKey?: string; // Key to track loading session
}

export function WavyLoadingText({ className = '', loadingKey }: WavyLoadingTextProps) {
  const [message, setMessage] = useState('');
  const messageRef = useRef('');

  useEffect(() => {
    // Only select a new message if loadingKey changes or it's the first render
    if (!messageRef.current || loadingKey !== messageRef.current) {
      const randomMessage = WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)];
      setMessage(randomMessage);
      messageRef.current = loadingKey || randomMessage;
    }
  }, [loadingKey]);

  if (!message) return null;

  return (
    <span className={`wavy-loading-text ${className}`}>
      {message}
    </span>
  );
}
