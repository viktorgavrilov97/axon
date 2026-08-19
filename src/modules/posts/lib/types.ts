export type PostType = "TEXT" | "IMAGE" | "VIDEO";

export interface PostDto {
  id: string;
  title: string;
  content?: string;
  coverUrl?: string;
  youtubeUrl?: string;
  type: PostType;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
