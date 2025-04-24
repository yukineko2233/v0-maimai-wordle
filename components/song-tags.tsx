import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Tag } from "@/types/game"

interface SongTagsProps {
    tags: Tag[]
}

export default function SongTags({ tags }: SongTagsProps) {
    if (!tags || tags.length === 0) {
        return <div className="text-xs text-gray-500">无标签数据</div>
    }

    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
                <TooltipProvider key={tag.id}>
                    <Tooltip>
                        <TooltipTrigger asChild>
              <span
                  className={`text-xs px-1.5 py-0.5 rounded-md ${tag.shared ? "text-green-800 bg-green-100 border-green-300" : "text-gray-800 bg-gray-100 border-gray-300"}`}
                  style={{ borderWidth: "1px" }}
              >
                {tag.localized_name["zh-Hans"]}
              </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tag.localized_description["zh-Hans"]}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ))}
        </div>
    )
}
