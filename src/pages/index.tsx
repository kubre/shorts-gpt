import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";

import { api } from "app/utils/api";
import { useEffect, useRef, useState } from "react";
import srtParser2 from "srt-parser-2";
const srtParser = new srtParser2();

const makePrompt = (line: string) => {
  return `I want you to act as a text terminal that only answers in a single line with no labels. If asked about dogs your answer should be "Dog, Animal, Nature, Friend" and nothing else
Question. \nFollowing is the text from part of the audio clip can you in 1-2 words describe the subject of the text also 3-4 related concepts. Make sure to not add anything else \n """${line}"""`;
};

const Home: NextPage = () => {
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [id, setId] = useState<NodeJS.Timeout>();
  const [openAiToken, setOpenAiToken] = useState<string>();
  const [pexelsToken, setPexelsToken] = useState<string>();
  const [srtString, setSrtString] = useState<string>();

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });
    const chunks: Blob[] = [];

    mediaRecorder.addEventListener("dataavailable", (event) => {
      chunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      const blob = new Blob(chunks);
      console.log(blob.size);
      submitAudio(blob).catch(console.error);
      // setAudio(blob);
      const audioURL = URL.createObjectURL(blob);
      if (audioElement.current) {
        audioElement.current.src = audioURL;
        audioElement.current.play().catch(console.error);
      }
    });

    mediaRecorder.start();
    console.log("started");
    setId(
      setTimeout(() => {
        mediaRecorder.stop();
        console.log("stopped");
        clearTimeout(id);
        setId(undefined);
      }, 5000)
    );
  };

  const submitAudio = async (blob: Blob) => {
    if (!blob || !openAiToken) return;
    const formData = new FormData();
    const audioFile = new File([blob], "file.wav", { type: "audio/wav" });
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");
    formData.append("response_format", "srt");
    formData.append("language", "en");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${openAiToken}`,
      },
    });
    const data = await res.text();
    setSrtString(data);
    const concepts = (await extractSubjects(data).catch(console.error)) ?? [];
    const photos = (await getImages(concepts).catch(console.error)) ?? [];
  };

  const extractSubjects = async (srtString: string | undefined) => {
    if (!srtString || !openAiToken) return [];
    const srtData = srtParser.fromSrt(srtString);
    const prompts = srtData.map((line) => makePrompt(line.text));
    const concepts: string[] = [];
    concepts.push(
      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiToken}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          max_tokens: 300,
          temperature: 0.0,
          messages: [{ role: "user", content: prompts[0] }],
        }),
      })
        .then(
          (res) =>
            res.json() as Promise<{
              choices: { message: { content: string } }[];
            }>
        )
        .then((res) => res.choices?.[0]?.message.content || "")
    );
    console.log("Concepts found: ", concepts);
    return concepts.filter((concept) => concept.length);
  };

  const getImages = async (concepts: string[]) => {
    if (!concepts[0] || !pexelsToken) return [];

    const photos = [];
    photos.push(
      await fetch(
        `https://api.pexels.com/v1/search?query=${concepts[0]}&per_page=1`,
        {
          headers: {
            Authorization: pexelsToken,
          },
        }
      )
        .then(
          (res) =>
            res.json() as Promise<{
              photos: { src: { portrait: string } }[];
            }>
        )
        .then((res) => res.photos?.[0]?.src.portrait || "")
    );
    console.log("Photos found: ", photos);
    return photos
      .filter((photo) => photo.length)
      .map((photo) => {
        const url = new URL(photo);
        url.searchParams.set("w", "675");
        return url.toString();
      });
  };

  useEffect(() => {
    return () => {
      if (id) {
        clearTimeout(id);
        setId(undefined);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>ShortsGPT</title>
        <meta name="description" content="" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#15162c] to-[#1d0128]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            <span className="text-[hsl(280,100%,71%)]">Shorts</span> in Seconds
          </h1>
          <p className="text-xl font-bold text-white">
            Generate Short video just by talking into the mic!
          </p>
          <div className="flex flex-col items-center gap-2">
            <input
              type="text"
              // tailwind input styles
              className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="OpenAI Token"
              onChange={(e) => setOpenAiToken(e.target.value)}
            />
            <button
              className="flex items-center justify-between gap-x-1 rounded-full bg-[hsl(280,100%,71%)] px-10 py-3 font-semibold text-white no-underline transition hover:bg-[hsl(280,100%,71%,0.8)]"
              onClick={() => {
                startRecording().catch(console.error);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
              <span>{!!id ? "Recording" : "Record Audio"}</span>
            </button>
            <div
              className={`mt-4 flex flex-col gap-y-2 transition-opacity ${
                audioElement.current?.src ? "opacity-100" : "opacity-0"
              }`}
            >
              <audio ref={audioElement} controls></audio>
              {/* <button
                onClick={submitAudio}
                className="rounded-full bg-[hsl(280,100%,71%)] px-10 py-3 font-semibold text-white no-underline transition hover:bg-[hsl(280,100%,71%,0.8)]"
              >
                {" "}
                Generate Video
              </button> */}
            </div>
            <h4 className="mt-4 font-bold text-white">Transcribed Text</h4>
            <pre className="border-1 max-w-screen-md overflow-x-scroll rounded-lg border-zinc-500 bg-zinc-900 p-4 text-white">
              <code>{srtString}</code>
            </pre>
            {/* <AuthShowcase /> */}
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined }
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};
