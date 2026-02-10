import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, AbsoluteFill } from 'remotion';
import { Player } from '@remotion/player';
import { Icons } from './Icons';

// --- Reusable Components for the Animation ---

const Card = ({ title, subtitle, opacity = 1, scale = 1, y = 0, verified = false }: any) => (
    <div
        className="bg-[#1A1A1A] border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-lg mb-3 mx-auto w-full max-w-[90%]"
        style={{ opacity, transform: `scale(${scale}) translateY(${y}px)` }}
    >
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                <Icons.User size={14} />
            </div>
            <div>
                <div className="h-2.5 w-24 bg-white/20 rounded mb-1.5" />
                <div className="h-2 w-16 bg-white/10 rounded" />
            </div>
        </div>
        {verified ? (
            <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center">
                    <Icons.Check size={12} strokeWidth={3} />
                </div>
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                    <Icons.Mail size={12} strokeWidth={3} />
                </div>
            </div>
        ) : (
            <div className="flex gap-2 opacity-50">
                <div className="w-6 h-6 rounded-lg bg-white/5 animate-pulse" />
                <div className="w-6 h-6 rounded-lg bg-white/5 animate-pulse" />
            </div>
        )}
    </div>
);

const SearchBar = ({ text = "", showCursor = true }) => (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-3 flex items-center gap-3 w-full max-w-[90%] mx-auto shadow-2xl">
        <Icons.Search className="text-[#39F265] w-5 h-5 ml-1" />
        <span className="text-white font-medium text-sm">{text}</span>
        {showCursor && <div className="w-0.5 h-5 bg-[#39F265] animate-pulse" />}
    </div>
);

// --- Scenes ---

const Scene1_Search = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Typing effect
    const fullText = "Dentistas em São Paulo";
    const progress = interpolate(frame, [15, 60], [0, fullText.length], { extrapolateRight: "clamp" });
    const text = fullText.substring(0, Math.floor(progress));

    // Fade out at end
    const opacity = interpolate(frame, [80, 90], [1, 0], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill className="justify-center items-center bg-[#0A0A0A]" style={{ opacity }}>
            <div className="w-full flex flex-col gap-6 items-center">
                <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">01. Defina o Alvo</div>
                <SearchBar text={text} showCursor={frame < 70} />

                <div className="flex gap-2 mt-4 opacity-50">
                    <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-white/60 border border-white/10">Odontologia</div>
                    <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-white/60 border border-white/10">Clinícas</div>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const Scene2_Enrich = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const exitOpacity = interpolate(frame, [80, 90], [1, 0], { extrapolateRight: "clamp" });

    // Staggered items
    const item1Y = interpolate(frame, [10, 25], [20, 0], { extrapolateRight: "clamp" });
    const item1Op = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

    const item2Y = interpolate(frame, [15, 30], [20, 0], { extrapolateRight: "clamp" });
    const item2Op = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });

    const item3Y = interpolate(frame, [20, 35], [20, 0], { extrapolateRight: "clamp" });
    const item3Op = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });

    // Verification effect
    const verified = frame > 45;

    return (
        <AbsoluteFill className="justify-center items-center bg-[#0A0A0A]" style={{ opacity: Math.min(opacity, exitOpacity) }}>
            <div className="w-full flex flex-col gap-2 items-center">
                <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-6">02. Ative a IA</div>
                <Card y={item1Y} opacity={item1Op} verified={verified} />
                <Card y={item2Y} opacity={item2Op} verified={verified} />
                <Card y={item3Y} opacity={item3Op} verified={verified} />
            </div>
        </AbsoluteFill>
    );
};

const Scene3_CRM = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

    // Drag effect
    const dragX = interpolate(frame, [30, 60], [0, 180], { extrapolateRight: "clamp" });
    const scale = interpolate(frame, [30, 45, 60], [1, 1.05, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill className="justify-center items-center bg-[#0A0A0A]" style={{ opacity }}>
            <div className="w-full flex flex-col items-center">
                <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-8">03. Feche Negócios</div>

                <div className="flex gap-4 w-[90%] h-48">
                    {/* Pipeline Column 1 */}
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-2 flex flex-col gap-2 relative">
                        <div className="text-[10px] text-white/40 font-bold uppercase mb-2 px-1">Leads</div>

                        {/* Draggable Card */}
                        <div style={{ transform: `translateX(${dragX}px) scale(${scale})`, zIndex: 10 }}>
                            <Card verified={true} />
                        </div>
                        <div className="opacity-50"><Card verified={true} /></div>
                    </div>

                    {/* Pipeline Column 2 */}
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-2 flex flex-col gap-2">
                        <div className="text-[10px] text-white/40 font-bold uppercase mb-2 px-1">Negociação</div>
                        {/* Placeholder for dropped card? maybe just move the other one visually */}
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};

// --- Main Composition ---

const MainComposition = () => {
    return (
        <AbsoluteFill className="bg-[#0A0A0A] text-white items-center justify-center rounded-3xl overflow-hidden">
            <Sequence from={0} durationInFrames={90}>
                <Scene1_Search />
            </Sequence>
            <Sequence from={90} durationInFrames={90}>
                <Scene2_Enrich />
            </Sequence>
            <Sequence from={180} durationInFrames={120}>
                <Scene3_CRM />
            </Sequence>
        </AbsoluteFill>
    );
};

// --- Player Wrapper ---

export const DemoAnimation = () => {
    return (
        <div className="w-full h-full rounded-3xl overflow-hidden bg-[#0A0A0A] shadow-2xl border border-white/5 ring-1 ring-white/10">
            <Player
                component={MainComposition}
                durationInFrames={300}
                compositionWidth={800}
                compositionHeight={600}
                fps={30}
                style={{
                    width: '100%',
                    height: '100%',
                }}
                controls={false}
                autoPlay
                loop
            />
        </div>
    );
};
