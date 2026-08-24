import { Dialog, DialogContent } from "@/components/ui/dialog";
import { findArticle, FIRST_ARTICLE_ID } from "@/guide/content";
import { GuideNav } from "@/guide/components/GuideNav";
import { GuideArticleView } from "@/guide/components/GuideArticleView";
import { useGuideStore } from "@/guide/useGuideStore";

export function GuideDialog() {
  const open = useGuideStore((s) => s.open);
  const articleId = useGuideStore((s) => s.articleId);
  const closeGuide = useGuideStore((s) => s.closeGuide);
  const setArticle = useGuideStore((s) => s.setArticle);

  const location = findArticle(articleId) ?? findArticle(FIRST_ARTICLE_ID);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeGuide()}>
      <DialogContent
        layout="flush"
        showClose={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        aria-label="Lux guide"
        className="h-[90dvh] w-[min(60rem,calc(100vw-2rem))]"
      >
        <div className="flex min-h-0 flex-1">
          <GuideNav articleId={location?.article.id ?? ""} onSelect={setArticle} />
          <div className="flex min-w-0 flex-1 flex-col">
            {location && <GuideArticleView location={location} onSelect={setArticle} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
