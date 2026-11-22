import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GitBranch, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

type BTNodeKind = 'root' | 'composite' | 'task';

interface BTNodeSpec {
  id: string;
  label: string;
  subtitle: string;
  kind: BTNodeKind;
  decorator?: string;
  service?: string;
  cppClass: string;
  blackboardKeys: string[];
  mobileNote: string;
  children?: BTNodeSpec[];
}

interface PositionedNode {
  id: string;
  data: BTNodeSpec;
  x: number;
  y: number;
  parentId: string | null;
}

const BEHAVIOR_TREES: Record<'henchman' | 'boss', { title: string; asset: string; root: BTNodeSpec; tickPath: string[] }> = {
  henchman: {
    title: 'Precinct Henchman AI',
    asset: 'BT_CairoHenchman',
    tickPath: ['h_root', 'h_sel', 'h_seq_combat', 'h_move_range', 'h_strafe', 'h_fire'],
    root: {
      id: 'h_root',
      label: 'ROOT',
      subtitle: 'BT_CairoHenchman',
      kind: 'root',
      cppClass: 'UBehaviorTree',
      blackboardKeys: ['BB_CairoAI'],
      mobileNote: 'Shared tree instance across up to 8 active precinct henchmen.',
      children: [
        {
          id: 'h_sel',
          label: 'Selector',
          subtitle: 'Combat vs Patrol',
          kind: 'composite',
          service: 'BTS_UpdateSight (0.25s)',
          cppClass: 'UBTComposite_Selector',
          blackboardKeys: ['TargetPlayer', 'CanSeePlayer'],
          mobileNote: 'Throttled 4 Hz perception service avoids per-frame line traces.',
          children: [
            {
              id: 'h_seq_combat',
              label: 'Sequence',
              subtitle: 'Engage Target',
              kind: 'composite',
              decorator: 'TargetPlayer IsSet',
              cppClass: 'UBTComposite_Sequence',
              blackboardKeys: ['TargetPlayer', 'LastKnownLocation'],
              mobileNote: 'Aborts Patrol branch immediately on sight or damage stimulus.',
              children: [
                {
                  id: 'h_move_range',
                  label: 'MoveTo Range',
                  subtitle: 'Acceptable 12m',
                  kind: 'task',
                  cppClass: 'UBTTask_MoveTo',
                  blackboardKeys: ['TargetPlayer'],
                  mobileNote: 'Queries baked NavMesh strictly inside low-poly Shubra block.',
                },
                {
                  id: 'h_strafe',
                  label: 'Cover Strafe',
                  subtitle: 'Taxi / Barrier',
                  kind: 'task',
                  cppClass: 'UBTTask_CairoStrafe',
                  blackboardKeys: ['StrafeDirection'],
                  mobileNote: 'Flips strafe vector every 1.2–2.4s using local collision test.',
                },
                {
                  id: 'h_fire',
                  label: 'Fire Rifle Burst',
                  subtitle: 'Cooldown 1.4s',
                  kind: 'task',
                  cppClass: 'UBTTask_CairoTacticalAttack',
                  blackboardKeys: ['TargetPlayer'],
                  mobileNote: 'Applies stance accuracy modifier when player crouches.',
                },
              ],
            },
            {
              id: 'h_seq_patrol',
              label: 'Sequence',
              subtitle: 'Alley Patrol',
              kind: 'composite',
              decorator: 'TargetPlayer NotSet',
              cppClass: 'UBTComposite_Sequence',
              blackboardKeys: ['PatrolPoint'],
              mobileNote: 'Idle state when player has not alerted the precinct courtyard.',
              children: [
                {
                  id: 'h_pick_wp',
                  label: 'Next Waypoint',
                  subtitle: 'Shubra Alley Node',
                  kind: 'task',
                  cppClass: 'UBTTask_PickPatrolPoint',
                  blackboardKeys: ['PatrolPoint'],
                  mobileNote: 'Alternates between pre-baked patrol spline points.',
                },
                {
                  id: 'h_wait',
                  label: 'Wait & Scan',
                  subtitle: '2.0s ± 0.5s',
                  kind: 'task',
                  cppClass: 'UBTTask_Wait',
                  blackboardKeys: [],
                  mobileNote: 'Zero CPU cost timer node while patrolling.',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  boss: {
    title: 'El-Ameen Boss AI',
    asset: 'BT_CairoBoss',
    tickPath: ['b_root', 'b_sel', 'b_seq_p2', 'b_flankers', 'b_laser', 'b_volley'],
    root: {
      id: 'b_root',
      label: 'ROOT',
      subtitle: 'BT_CairoBoss',
      kind: 'root',
      cppClass: 'UBehaviorTree',
      blackboardKeys: ['BB_CairoBoss'],
      mobileNote: 'Drives El-Ameen, Zarzour, El-Hefny, and Syndicate Architect via Blackboard tuning.',
      children: [
        {
          id: 'b_sel',
          label: 'Selector',
          subtitle: 'Phase Priority',
          kind: 'composite',
          service: 'BTS_BossPhaseEval (0.2s)',
          cppClass: 'UBTComposite_Selector',
          blackboardKeys: ['BossHealthPct', 'BossPhase'],
          mobileNote: 'Evaluates Phase 2 transition once when HP drops below 50%.',
          children: [
            {
              id: 'b_seq_p2',
              label: 'Sequence',
              subtitle: 'Phase 2 Enrage',
              kind: 'composite',
              decorator: 'HealthPct <= 0.50',
              cppClass: 'UBTComposite_Sequence',
              blackboardKeys: ['BossPhase', 'FlankersSpawned'],
              mobileNote: 'Activates 2 pooled precinct guards to avoid mid-fight GC spikes.',
              children: [
                {
                  id: 'b_flankers',
                  label: 'Call Flankers',
                  subtitle: 'Activate Pool (2)',
                  kind: 'task',
                  cppClass: 'UBTTask_SpawnFlankers',
                  blackboardKeys: ['FlankersSpawned'],
                  mobileNote: 'Triggers one-time boss horn audio & HUD alert delegate.',
                },
                {
                  id: 'b_laser',
                  label: 'Laser Windup',
                  subtitle: 'Telegraph 0.45s',
                  kind: 'task',
                  cppClass: 'UBTTask_BossWindup',
                  blackboardKeys: ['IsWindingUp'],
                  mobileNote: 'Renders warning laser beam so player can duck into cover.',
                },
                {
                  id: 'b_volley',
                  label: 'Heavy Volley',
                  subtitle: '4-Round Suppression',
                  kind: 'task',
                  cppClass: 'UBTTask_CairoTacticalAttack',
                  blackboardKeys: ['TargetPlayer'],
                  mobileNote: 'Adapts projectile pattern (burst / shotgun / sniper / pulse).',
                },
              ],
            },
            {
              id: 'b_seq_p1',
              label: 'Sequence',
              subtitle: 'Phase 1 Pressure',
              kind: 'composite',
              decorator: 'HasLineOfSight',
              cppClass: 'UBTComposite_Sequence',
              blackboardKeys: ['TargetPlayer', 'PreferredRange'],
              mobileNote: 'Maintains tactical range while armored chest plate mitigates body hits.',
              children: [
                {
                  id: 'b_advance',
                  label: 'Tactical Press',
                  subtitle: 'Range 9m–15m',
                  kind: 'task',
                  cppClass: 'UBTTask_MoveTo',
                  blackboardKeys: ['TargetPlayer'],
                  mobileNote: 'Uses EQ_CairoFlank cover scoring without heavy grid queries.',
                },
                {
                  id: 'b_burst',
                  label: 'Aimed Burst',
                  subtitle: '3-Round Volley',
                  kind: 'task',
                  cppClass: 'UBTTask_CairoTacticalAttack',
                  blackboardKeys: ['TargetPlayer'],
                  mobileNote: 'Triggers camera shake trauma on direct player hit.',
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

const NODE_W = 152;
const NODE_H = 66;

interface VisualBlueprintLogicProps {
  compact?: boolean;
}

export const VisualBlueprintLogic: React.FC<VisualBlueprintLogicProps> = ({ compact = false }) => {
  const [treeKey, setTreeKey] = useState<'henchman' | 'boss'>('boss');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('b_seq_p2');
  const [isSimulating, setIsSimulating] = useState(true);
  const [simStepIdx, setSimStepIdx] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<PositionedNode[]>([]);

  const activeTree = BEHAVIOR_TREES[treeKey];

  // Flatten hierarchical lookup for the inspector panel
  const nodeMap = useMemo(() => {
    const map = new Map<string, BTNodeSpec>();
    const walk = (n: BTNodeSpec) => {
      map.set(n.id, n);
      n.children?.forEach(walk);
    };
    walk(activeTree.root);
    return map;
  }, [activeTree]);

  const selectedNode = nodeMap.get(selectedNodeId) ?? activeTree.root;
  const activeSimNodeId = isSimulating ? activeTree.tickPath[simStepIdx % activeTree.tickPath.length] : null;

  // Reset selected node when switching between Henchman and Boss trees
  useEffect(() => {
    setSelectedNodeId(treeKey === 'boss' ? 'b_seq_p2' : 'h_seq_combat');
    setSimStepIdx(0);
  }, [treeKey]);

  // Live UE5-style Behavior Tree execution flow tick simulator
  useEffect(() => {
    if (!isSimulating) return;
    const id = window.setInterval(() => {
      setSimStepIdx((prev) => (prev + 1) % activeTree.tickPath.length);
    }, 950);
    return () => clearInterval(id);
  }, [isSimulating, activeTree.tickPath.length]);

  // Build & render interactive D3 node graph (zoom, pan, draggable nodes, dynamic curved connectors)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth || (compact ? 360 : 880);
    const height = svgEl.clientHeight || (compact ? 320 : 480);

    // 1. Blueprint Grid Pattern Defs
    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', `bp-grid-${compact ? 'c' : 'f'}`)
      .attr('width', 24)
      .attr('height', 24)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern
      .append('path')
      .attr('d', 'M 24 0 L 0 0 0 24')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.045)')
      .attr('stroke-width', 1);

    svg
      .append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', `url(#bp-grid-${compact ? 'c' : 'f'})`);

    const viewport = svg.append('g').attr('class', 'bp-viewport');
    const linksLayer = viewport.append('g').attr('class', 'bp-links');
    const nodesLayer = viewport.append('g').attr('class', 'bp-nodes');

    // 2. Compute D3 Tree Layout
    const rootHierarchy = d3.hierarchy<BTNodeSpec>(activeTree.root);
    const treeLayout = d3.tree<BTNodeSpec>().nodeSize([NODE_W + 26, NODE_H + 58]);
    treeLayout(rootHierarchy);

    const positionedNodes: PositionedNode[] = rootHierarchy.descendants().map((d) => ({
      id: d.data.id,
      data: d.data,
      x: d.x ?? 0,
      y: d.y ?? 0,
      parentId: d.parent ? d.parent.data.id : null,
    }));
    nodesRef.current = positionedNodes;

    const byId = new Map<string, PositionedNode>(positionedNodes.map((n) => [n.id, n]));
    const linksData = positionedNodes
      .filter((n) => n.parentId !== null)
      .map((child) => ({
        id: `${child.parentId}->${child.id}`,
        sourceId: child.parentId!,
        targetId: child.id,
      }));

    const linkGen = d3
      .linkVertical<
        { source: [number, number]; target: [number, number] },
        [number, number]
      >()
      .x((d) => d[0])
      .y((d) => d[1]);

    const computePath = (sourceId: string, targetId: string) => {
      const s = byId.get(sourceId)!;
      const t = byId.get(targetId)!;
      return linkGen({
        source: [s.x, s.y + NODE_H / 2],
        target: [t.x, t.y - NODE_H / 2],
      }) ?? '';
    };

    // 3. Draw Bezier Execution Wires
    const linkPaths = linksLayer
      .selectAll<SVGPathElement, (typeof linksData)[number]>('path')
      .data(linksData, (d) => d.id)
      .enter()
      .append('path')
      .attr('d', (d) => computePath(d.sourceId, d.targetId))
      .attr('fill', 'none')
      .attr('stroke', 'rgba(209, 213, 219, 0.35)')
      .attr('stroke-width', 2)
      .attr('data-target-id', (d) => d.targetId);

    // 4. Draw Draggable UE5 Blueprint Nodes
    const nodeGroups = nodesLayer
      .selectAll<SVGGElement, PositionedNode>('g.bt-node')
      .data(positionedNodes, (d) => d.id)
      .enter()
      .append('g')
      .attr('class', 'bt-node')
      .attr('data-node-id', (d) => d.id)
      .attr('transform', (d) => `translate(${d.x - NODE_W / 2}, ${d.y - NODE_H / 2})`)
      .style('cursor', 'grab')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
      });

    // Main Node Body
    nodeGroups
      .append('rect')
      .attr('class', 'node-frame')
      .attr('width', NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 7)
      .attr('fill', '#161A20')
      .attr('stroke', 'rgba(255,255,255,0.16)')
      .attr('stroke-width', 1.4);

    // UE5 Node Type Header Strip
    nodeGroups
      .append('path')
      .attr('d', `M 0 7 Q 0 0 7 0 L ${NODE_W - 7} 0 Q ${NODE_W} 0 ${NODE_W} 7 L ${NODE_W} 24 L 0 24 Z`)
      .attr('fill', (d) =>
        d.data.kind === 'root' ? '#374151' : d.data.kind === 'composite' ? '#2B3544' : '#583276',
      );

    // Optional Decorator Blue Tag Bar (UE5 authentic convention)
    nodeGroups
      .filter((d) => Boolean(d.data.decorator))
      .append('rect')
      .attr('x', 6)
      .attr('y', -13)
      .attr('width', NODE_W - 12)
      .attr('height', 15)
      .attr('rx', 3)
      .attr('fill', '#1D4ED8');

    nodeGroups
      .filter((d) => Boolean(d.data.decorator))
      .append('text')
      .attr('x', NODE_W / 2)
      .attr('y', -2.5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#EFF6FF')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '9px')
      .text((d) => d.data.decorator ?? '');

    // Input & Output Execution Pins
    nodeGroups
      .filter((d) => d.parentId !== null)
      .append('circle')
      .attr('cx', NODE_W / 2)
      .attr('cy', 0)
      .attr('r', 3.5)
      .attr('fill', '#E89B3C')
      .attr('stroke', '#0D0F12')
      .attr('stroke-width', 1.2);

    nodeGroups
      .filter((d) => Boolean(d.data.children && d.data.children.length > 0))
      .append('circle')
      .attr('cx', NODE_W / 2)
      .attr('cy', NODE_H)
      .attr('r', 3.5)
      .attr('fill', '#E89B3C')
      .attr('stroke', '#0D0F12')
      .attr('stroke-width', 1.2);

    // Node Header Label
    nodeGroups
      .append('text')
      .attr('x', 10)
      .attr('y', 16)
      .attr('fill', '#FFFFFF')
      .attr('font-family', 'Chakra Petch, sans-serif')
      .attr('font-weight', '700')
      .attr('font-size', '11.5px')
      .text((d) => d.data.label);

    // Node Kind Tag on Right of Header
    nodeGroups
      .append('text')
      .attr('x', NODE_W - 8)
      .attr('y', 15.5)
      .attr('text-anchor', 'end')
      .attr('fill', 'rgba(255,255,255,0.65)')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '8.5px')
      .text((d) => (d.data.kind === 'root' ? 'ROOT' : d.data.kind === 'composite' ? 'COMP' : 'TASK'));

    // Node Subtitle
    nodeGroups
      .append('text')
      .attr('x', 10)
      .attr('y', 42)
      .attr('fill', '#D1D5DB')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .attr('font-size', '10.5px')
      .text((d) => d.data.subtitle);

    // Optional Service Line
    nodeGroups
      .filter((d) => Boolean(d.data.service))
      .append('text')
      .attr('x', 10)
      .attr('y', 56)
      .attr('fill', '#6EE7B7')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '8.5px')
      .text((d) => d.data.service ?? '');

    // 5. D3 Drag Handler for Free Node Rearrangement
    const dragBehavior = d3
      .drag<SVGGElement, PositionedNode>()
      .on('start', function (event) {
        event.sourceEvent.stopPropagation();
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (event, d) {
        d.x += event.dx;
        d.y += event.dy;
        d3.select(this).attr('transform', `translate(${d.x - NODE_W / 2}, ${d.y - NODE_H / 2})`);
        linkPaths.attr('d', (l) => computePath(l.sourceId, l.targetId));
      })
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      });

    nodeGroups.call(dragBehavior);

    // 6. D3 Zoom & Pan Behavior + Auto-Fit Initial Transform
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.38, 1.8])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const minX = d3.min(positionedNodes, (n) => n.x - NODE_W / 2) ?? -200;
    const maxX = d3.max(positionedNodes, (n) => n.x + NODE_W / 2) ?? 200;
    const minY = d3.min(positionedNodes, (n) => n.y - NODE_H / 2 - 16) ?? -40;
    const maxY = d3.max(positionedNodes, (n) => n.y + NODE_H / 2) ?? 320;
    const graphW = Math.max(1, maxX - minX + 48);
    const graphH = Math.max(1, maxY - minY + 48);
    const initScale = Math.min(1.0, Math.min(width / graphW, height / graphH));
    const tx = width / 2 - ((minX + maxX) / 2) * initScale;
    const ty = 26 - minY * initScale;

    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(initScale));
  }, [activeTree, compact]);

  // Update active selection & live tick highlight cleanly without rebuilding the D3 graph
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);

    svg.selectAll<SVGRectElement, PositionedNode>('g.bt-node rect.node-frame').each(function (d) {
      const isSelected = d.id === selectedNodeId;
      const isActiveTick = d.id === activeSimNodeId;
      d3.select(this)
        .attr('stroke', isActiveTick ? '#E89B3C' : isSelected ? '#FDE68A' : 'rgba(255,255,255,0.16)')
        .attr('stroke-width', isActiveTick || isSelected ? 2.4 : 1.4);
    });

    const activeIdx = activeSimNodeId ? activeTree.tickPath.indexOf(activeSimNodeId) : -1;
    svg.selectAll<SVGPathElement, { targetId: string }>('g.bp-links path').each(function (d) {
      const targetIdx = activeTree.tickPath.indexOf(d.targetId);
      const isLit = activeIdx >= 0 && targetIdx > 0 && targetIdx <= activeIdx;
      d3.select(this)
        .attr('stroke', isLit ? '#E89B3C' : 'rgba(209, 213, 219, 0.35)')
        .attr('stroke-width', isLit ? 2.8 : 2);
    });
  }, [selectedNodeId, activeSimNodeId, activeTree.tickPath]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(180).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetView = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svgEl = svgRef.current;
    const width = svgEl.clientWidth || 360;
    const height = svgEl.clientHeight || 320;
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;
    const minX = d3.min(nodes, (n) => n.x - NODE_W / 2) ?? -200;
    const maxX = d3.max(nodes, (n) => n.x + NODE_W / 2) ?? 200;
    const minY = d3.min(nodes, (n) => n.y - NODE_H / 2 - 16) ?? -40;
    const maxY = d3.max(nodes, (n) => n.y + NODE_H / 2) ?? 320;
    const scale = Math.min(1.0, Math.min(width / (maxX - minX + 48), height / (maxY - minY + 48)));
    const tx = width / 2 - ((minX + maxX) / 2) * scale;
    const ty = 26 - minY * scale;
    d3.select(svgEl)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar: Tree Switcher + Tick Simulation + Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
          <button
            type="button"
            onClick={() => setTreeKey('boss')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
              treeKey === 'boss' ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            El-Ameen Boss
          </button>
          <button
            type="button"
            onClick={() => setTreeKey('henchman')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
              treeKey === 'henchman' ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Henchman AI
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsSimulating((s) => !s)}
            title={isSimulating ? 'Pause Execution Flow' : 'Simulate Behavior Tree Flow'}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
              isSimulating
                ? 'border-[#E89B3C]/60 bg-[#E89B3C]/15 text-[#FDE68A]'
                : 'border-white/12 bg-[#161A20] text-[#D1D5DB] hover:text-white'
            }`}
          >
            {isSimulating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isSimulating ? 'Flow On' : 'Flow Off'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.2)}
            title="Zoom In"
            className="flex h-7 w-7 items-center justify-center rounded border border-white/12 bg-[#161A20] text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.82)}
            title="Zoom Out"
            className="flex h-7 w-7 items-center justify-center rounded border border-white/12 bg-[#161A20] text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Fit Graph to View"
            className="flex h-7 w-7 items-center justify-center rounded border border-white/12 bg-[#161A20] text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive D3 Node Editor SVG Canvas */}
      <div className={`relative min-h-0 flex-1 overflow-hidden bg-[#0B0D10] ${compact ? 'min-h-[250px]' : 'min-h-[420px]'}`}>
        <svg ref={svgRef} className="h-full w-full touch-none" />
        <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] text-[#9CA3AF]">
          {activeTree.asset} · Drag nodes to reposition · Scroll to zoom · Click node to inspect
        </div>
      </div>

      {/* Selected Behavior Tree Node Inspector */}
      <div className="border-t border-white/10 bg-[#14181F] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-[#E89B3C]" />
            <span className="truncate font-display text-sm font-bold text-white">{selectedNode.label}</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">· {selectedNode.subtitle}</span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-[#E89B3C]">{selectedNode.cppClass}</span>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-[#D1D5DB]">{selectedNode.mobileNote}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[#9CA3AF]">
          <span>
            Blackboard:{' '}
            <span className="text-[#FDE68A]">
              {selectedNode.blackboardKeys.length > 0 ? selectedNode.blackboardKeys.join(', ') : 'None'}
            </span>
          </span>
          {selectedNode.decorator && (
            <span>
              Decorator: <span className="text-sky-300">{selectedNode.decorator}</span>
            </span>
          )}
          {selectedNode.service && (
            <span>
              Service: <span className="text-emerald-300">{selectedNode.service}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
