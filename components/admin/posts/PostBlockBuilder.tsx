// components/admin/posts/PostBlockBuilder.tsx
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  AlignLeft,
  Heading,
  Image,
  Images,
  Quote,
  List,
  MousePointer,
  Play,
  HelpCircle,
  Table,
  Minus,
  Code,
} from "lucide-react";
import type { ContentBlock, BlockType } from "@/types/post-blocks";
import { createBlock, BLOCK_TYPES } from "@/types/post-blocks";
import BlockEditor from "./BlockEditor";

interface PostBlockBuilderProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  AlignLeft: <AlignLeft size={18} />,
  Heading: <Heading size={18} />,
  Image: <Image size={18} />,
  Images: <Images size={18} />,
  Quote: <Quote size={18} />,
  List: <List size={18} />,
  MousePointer: <MousePointer size={18} />,
  Play: <Play size={18} />,
  HelpCircle: <HelpCircle size={18} />,
  Table: <Table size={18} />,
  Minus: <Minus size={18} />,
  Code: <Code size={18} />,
};

export default function PostBlockBuilder({ blocks, onChange }: PostBlockBuilderProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  function addBlock(type: BlockType) {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
    setShowAddMenu(false);
  }

  function updateBlock(index: number, block: ContentBlock) {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    onChange(newBlocks);
  }

  function deleteBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(from, 1);
    newBlocks.splice(to, 0, moved);
    onChange(newBlocks);
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Nội dung bài viết
        </label>
        <span className="text-xs text-gray-500">{blocks.length} block</span>
      </div>

      {/* Blocks list */}
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            onChange={(updated) => updateBlock(index, updated)}
            onDelete={() => deleteBlock(index)}
            onMoveUp={() => moveBlock(index, index - 1)}
            onMoveDown={() => moveBlock(index, index + 1)}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
          />
        ))}
      </div>

      {/* Add block button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-red-400 hover:text-red-500 transition-colors"
        >
          <Plus size={20} />
          <span>Thêm block</span>
        </button>

        {/* Add block menu */}
        {showAddMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowAddMenu(false)}
            />
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Chọn loại block</h4>
                <button
                  type="button"
                  onClick={() => setShowAddMenu(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    type="button"
                    onClick={() => addBlock(bt.type)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-red-400 hover:bg-red-50 transition-colors group"
                  >
                    <span className="text-gray-500 group-hover:text-red-500">
                      {iconMap[bt.icon]}
                    </span>
                    <span className="text-xs text-gray-700 group-hover:text-red-600">
                      {bt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Chưa có nội dung. Nhấn "Thêm block" để bắt đầu.</p>
        </div>
      )}
    </div>
  );
}
