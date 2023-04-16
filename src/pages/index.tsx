import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";

import { api } from "app/utils/api";
import { useEffect, useRef, useState } from "react";

const Home: NextPage = () => {
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [id, setId] = useState<NodeJS.Timeout>();

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
            <audio ref={audioElement}></audio>
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
