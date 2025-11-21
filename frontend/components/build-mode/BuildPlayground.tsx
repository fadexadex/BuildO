'use client';

import React, { useState, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CodeEditor, CodeDiffEditor } from './CodeEditor';
import { CircuitViz } from './CircuitViz';
import { parseCircuitForVisualization, CircuitNode, CircuitEdge } from '@/lib/circuit-parser';
import { Button } from '@/components/ui/button';
import { Play, Save, Terminal, Layers, Wand2, Loader2, History, Camera, Upload, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CircuitAgentAPI, ZkAPI } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INITIAL_CODE = `pragma circom 2.0.0;

template Multiplier2() {
   signal input a;
   signal input b;
   signal output c;
   c <== a * b;
}

component main = Multiplier2();`;

export function BuildPlayground() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [nodes, setNodes] = useState<CircuitNode[]>([]);
  const [edges, setEdges] = useState<CircuitEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // Execution State
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>(["> System Ready."]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);
  const [compiledArtifacts, setCompiledArtifacts] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [provingSystem, setProvingSystem] = useState<'groth16' | 'plonk' | 'fflonk'>('groth16');
  
  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("inputs");
  const { toast } = useToast();

  // Snapshot State
  const [snapshots, setSnapshots] = useState<Array<{id: string, timestamp: number, code: string}>>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [baseSnapshotId, setBaseSnapshotId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = parseCircuitForVisualization(code);
    setNodes(newNodes);
    setEdges(newEdges);
    setIsCompiled(false); // Reset compilation on code change
  }, [code]);

  const takeSnapshot = () => {
      const newSnap = {
          id: `snap-${Date.now()}`,
          timestamp: Date.now(),
          code: code
      };
      setSnapshots(prev => [newSnap, ...prev]);
      toast({ title: "Snapshot captured" });
  };

  const toggleCompare = (snapId: string) => {
      if (compareMode && baseSnapshotId === snapId) {
          setCompareMode(false);
          setBaseSnapshotId(null);
      } else {
          setCompareMode(true);
          setBaseSnapshotId(snapId);
      }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
               const text = e.target?.result as string;
               setCode(text);
               toast({ title: "File loaded", description: file.name });
          };
          reader.readAsText(file);
      }
  };

  const handleCompile = async () => {
      setIsCompiling(true);
      setActiveTab("console");
      addLog("> Compiling circuit...");
      try {
          const res = await ZkAPI.compileCircuit({ circuitCode: code, circuitName: 'custom' });
          if (res.success || res.artifacts) { // Adjust check based on API response structure
              addLog("> Compilation successful.");
              setIsCompiled(true);
              setCompiledArtifacts(res.artifacts);
              toast({ title: "Compilation Successful" });
          } else {
              // Display detailed error messages
              const errorMsg = res.error || 'Unknown compilation error';
              addLog(`> Compilation failed: ${errorMsg}`);
              
              // Display individual errors if available
              if (res.errors && Array.isArray(res.errors)) {
                  res.errors.forEach((err: string, idx: number) => {
                      addLog(`>   [Error ${idx + 1}] ${err}`);
                  });
              }
              
              toast({ 
                  title: "Compilation Failed", 
                  description: res.errors?.[0] || errorMsg,
                  variant: "destructive" 
              });
          }
      } catch (e: any) {
          const errorMessage = e.message || String(e);
          addLog(`> System Error: ${errorMessage}`);
          
          // Log detailed errors if available on the error object
          if (e.formattedErrors) {
              addLog(`> Detailed Errors:\n${e.formattedErrors}`);
          } else if (e.errors && Array.isArray(e.errors)) {
              e.errors.forEach((err: string, idx: number) => {
                  addLog(`>   [Error ${idx + 1}] ${err}`);
              });
          }

          toast({ 
              title: "System Error", 
              description: errorMessage,
              variant: "destructive" 
          });
      } finally {
          setIsCompiling(false);
      }
  };

  const handleRun = async () => {
      if (!isCompiled) {
          toast({ title: "Please compile first", variant: "destructive" });
          return;
      }
      setIsRunning(true);
      setActiveTab("console");
      addLog("> Generating proof...");
      try {
           const inputs: Record<string, any> = {};
           
           // Process inputs with auto-expansion for arrays
           Object.entries(inputValues).forEach(([k, v]) => {
               const node = nodes.find(n => n.type === 'input' && (n.name === k || n.label === k));
               
               // Check for array auto-expansion: if it's an array node but value is scalar
               if (node?.isArray && node.size && v && !v.trim().startsWith('[') && !v.trim().startsWith('{')) {
                   const size = parseInt(String(node.size));
                   if (!isNaN(size) && size > 0) {
                       addLog(`> Auto-expanding input '${k}' to array of size ${size}`);
                       inputs[k] = Array(size).fill(v.trim());
                       return;
                   }
               }

               // Regular parsing
               try {
                   if (v.trim().startsWith('[') || v.trim().startsWith('{')) {
                       inputs[k] = JSON.parse(v);
                   } else {
                       inputs[k] = v; // Pass as string
                   }
               } catch (e) {
                   inputs[k] = v;
               }
           });
           
           const res = await ZkAPI.generateProof({ circuitName: 'custom', inputs, provingSystem });
           if (res.success || res.proof) {
                addLog("> Proof generated successfully.");
                addLog(`> Public Signals: ${JSON.stringify(res.publicSignals)}`);
                toast({ title: "Proof Generated" });
                
                // Update Visualization with values if possible
                // (Requires mapping inputs back to nodes)
           } else {
                const errorMsg = res.error || 'Proof generation failed';
                addLog(`> Proof generation failed: ${errorMsg}`);
                
                // Display individual errors if available
                if (res.errors && Array.isArray(res.errors)) {
                    res.errors.forEach((err: string, idx: number) => {
                        addLog(`>   [Error ${idx + 1}] ${err}`);
                    });
                }
                
                toast({ 
                    title: "Proof Generation Failed", 
                    description: res.errors?.[0] || errorMsg,
                    variant: "destructive" 
                });
           }
      } catch (e: any) {
            const errorMessage = e.message || String(e);
            addLog(`> Execution Error: ${errorMessage}`);

            // Log detailed errors if available on the error object
            if (e.formattedErrors) {
                addLog(`> Detailed Errors:\n${e.formattedErrors}`);
            } else if (e.errors && Array.isArray(e.errors)) {
                e.errors.forEach((err: string, idx: number) => {
                    addLog(`>   [Error ${idx + 1}] ${err}`);
                });
            }

            toast({ 
                title: "Execution Error", 
                description: errorMessage,
                variant: "destructive" 
            });
      } finally {
          setIsRunning(false);
      }
  };

  const handleAiGenerate = async () => {
    setIsGenerating(true);
    try {
        const result = await CircuitAgentAPI.design(prompt, 'generate');
        if (result.success) {
            // Extract code from markdown block if present
            const codeMatch = result.data.match(/```circom\n([\s\S]*?)```/);
            const cleanCode = codeMatch ? codeMatch[1] : result.data;
            setCode(cleanCode);
            setShowAiDialog(false);
            toast({
                title: "Circuit Generated",
                description: "Your circuit has been successfully generated.",
            });
        } else {
            throw new Error(result.error || "Failed to generate");
        }
    } catch (e) {
        console.error(e);
        toast({
            title: "Generation Failed",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive"
        });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950">
        {/* Toolbar */}
        <div className="h-12 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900">
            <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-200 font-semibold text-sm">main.circom</span>
            </div>
            <div className="flex items-center gap-2">
                 <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="mr-2 bg-purple-600 text-white hover:bg-purple-500 border-purple-500 shadow-md shadow-purple-500/20">
                      <Wand2 className="w-4 h-4 mr-2" /> AI Generate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle>Generate Circuit with AI</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Textarea 
                          value={prompt} 
                          onChange={(e) => setPrompt(e.target.value)} 
                          placeholder="Describe the circuit you want (e.g., 'Merkle tree membership proof with depth 4')"
                          className="min-h-[100px] bg-slate-950 border-slate-800 text-slate-200 focus:border-purple-500"
                        />
                        <Button onClick={handleAiGenerate} disabled={isGenerating || !prompt.trim()} className="w-full bg-purple-600 hover:bg-purple-700">
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                          Generate Circuit
                        </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                 <Select value={provingSystem} onValueChange={(v) => setProvingSystem(v as any)}>
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="System" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="groth16">Groth16</SelectItem>
                    <SelectItem value="plonk">PLONK</SelectItem>
                    <SelectItem value="fflonk">FFLONK</SelectItem>
                  </SelectContent>
                </Select>
                
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white"><History className="w-4 h-4 mr-2" /> History</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-slate-900 border-slate-700 mr-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <h4 className="font-medium text-white text-sm">Snapshots</h4>
                                <Button size="sm" variant="secondary" className="h-6 text-xs" onClick={takeSnapshot}><Camera className="w-3 h-3 mr-1"/> Capture</Button>
                            </div>
                            {snapshots.length === 0 && <div className="text-xs text-slate-500 text-center py-2">No snapshots yet.</div>}
                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                                {snapshots.map(snap => (
                                    <div key={snap.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-800 rounded group">
                                        <span className="text-slate-300 font-mono">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                                        <div className="flex gap-1">
                                            <Button 
                                                size="sm" 
                                                variant={compareMode && baseSnapshotId === snap.id ? "destructive" : "outline"} 
                                                className="h-6 text-[10px] px-2"
                                                onClick={() => toggleCompare(snap.id)}
                                            >
                                                {compareMode && baseSnapshotId === snap.id ? "Close Diff" : "Compare"}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setCode(snap.code)} title="Restore">
                                                <Play className="w-3 h-3 rotate-180" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                 <input type="file" ref={fileInputRef} className="hidden" accept=".circom" onChange={handleFileUpload} />
                 <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload
                 </Button>

                 <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white"><Save className="w-4 h-4 mr-2" /> Save</Button>
                 
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white ml-2" title="Guide"><HelpCircle className="w-4 h-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle>Build Mode Guide</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Welcome to the ZK Circuit Builder. Here's how to use the tools:
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 text-sm">
                            <ul className="list-disc pl-4 space-y-2 text-slate-300">
                                <li><strong className="text-purple-400">AI Assistant</strong>: Use the Wand icon to generate circuits from natural language descriptions.</li>
                                <li><strong className="text-indigo-400">Editor</strong>: Write standard Circom code. Autosaving is enabled locally.</li>
                                <li><strong className="text-green-400">Visualization</strong>: 3D view of your circuit's constraints and signals. Red nodes indicate errors.</li>
                                <li><strong className="text-orange-400">Snapshots</strong>: Use the History button to save versions and compare changes.</li>
                                <li><strong className="text-blue-400">Execution</strong>: Select a proving system (Groth16/Plonk) and click Compile & Run.</li>
                            </ul>
                        </div>
                    </DialogContent>
                </Dialog>
                 
                 <Button 
                    size="sm"  
                    className="bg-indigo-600 hover:bg-indigo-500 text-white ml-2"
                    onClick={handleCompile}
                    disabled={isCompiling}
                 >
                    {isCompiling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
                    Compile
                 </Button>

                 <Button 
                    size="sm"  
                    variant={isCompiled ? "secondary" : "ghost"}
                    className={`ml-2 ${isCompiled ? "text-white bg-green-600 hover:bg-green-700" : "text-slate-500"}`}
                    onClick={handleRun}
                    disabled={!isCompiled || isRunning}
                    title={!isCompiled ? "Compile the circuit first to run proofs" : "Run proof generation"}
                 >
                    {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Run Proof
                 </Button>
            </div>
        </div>
        
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={20} className="border-r border-slate-800">
          {compareMode && baseSnapshotId ? (
             <CodeDiffEditor 
                key={baseSnapshotId}
                original={snapshots.find(s => s.id === baseSnapshotId)?.code || ''} 
                modified={code} 
             />
          ) : (
             <CodeEditor code={code} onChange={setCode} />
          )}
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-slate-800" />
        
        <ResizablePanel defaultSize={60} minSize={30}>
            <ResizablePanelGroup direction="vertical">
                 <ResizablePanel defaultSize={70} className="relative">
                     <CircuitViz 
                        nodes={nodes} 
                        edges={edges} 
                        selectedNode={selectedNode} 
                        onNodeClick={setSelectedNode} 
                    />
                 </ResizablePanel>
                 
                 <ResizableHandle withHandle className="bg-slate-800" />
                 
                 <ResizablePanel defaultSize={30} minSize={10} className="bg-slate-900 flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                            <TabsList className="bg-slate-800/50 h-8">
                                <TabsTrigger value="inputs" className="text-xs h-7 data-[state=active]:bg-slate-700 data-[state=active]:text-white">Inputs</TabsTrigger>
                                <TabsTrigger value="console" className="text-xs h-7 data-[state=active]:bg-slate-700 data-[state=active]:text-white">Console</TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <TabsContent value="inputs" className="flex-1 p-4 overflow-auto m-0">
                             <div className="space-y-3">
                                {nodes.filter(n => n.type === 'input').map(node => (
                                    <div key={node.id} className="grid grid-cols-3 gap-2 items-center">
                                        <Label className="text-slate-400 text-xs font-mono" title={node.isArray ? `Array of size ${node.size}` : 'Scalar'}>
                                            {node.label}
                                        </Label>
                                        <Input 
                                            className="col-span-2 h-8 bg-slate-950 border-slate-800 text-slate-200 text-xs font-mono focus:border-indigo-500" 
                                            value={inputValues[node.name || node.label] || ''}
                                            onChange={(e) => setInputValues({...inputValues, [node.name || node.label]: e.target.value})}
                                            placeholder={node.isArray ? `Array [${node.size || 'N'}] (e.g. [1,2] or single value)` : "0"}
                                        />
                                    </div>
                                ))}
                                {nodes.filter(n => n.type === 'input').length === 0 && (
                                    <div className="text-slate-500 text-sm italic text-center pt-4">No inputs detected in circuit.</div>
                                )}
                                {!isCompiled && nodes.filter(n => n.type === 'input').length > 0 && (
                                    <div className="text-yellow-600 text-xs mt-4 flex items-center gap-2 bg-yellow-950/20 p-2 rounded">
                                        <Layers className="w-3 h-3" /> Compile to enable execution
                                    </div>
                                )}
                             </div>
                        </TabsContent>
                        
                        <TabsContent value="console" className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 m-0 space-y-1">
                            {logs.map((log, i) => <div key={i} className="break-all">{log}</div>)}
                        </TabsContent>
                    </Tabs>
                 </ResizablePanel>
            </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
