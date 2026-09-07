import { Dialog } from "@/components/ui/dialog";
import { RailDialogContent } from "@/components/DialogChrome";
import { findArticle, FIRST_ARTICLE_ID } from "@/guide/content";
import { GuideNav } from "@/guide/components/GuideNav";
import { GuideArticleView } from "@/guide/components/GuideArticleView";
import { useGuideStore } from "@/stores/useGuideStore";

export function GuideDialog() {
  const open = useGuideStore((s) => s.open);
  const articleId = useGuideStore((s) => s.articleId);
  const closeGuide = useGuideStore((s) => s.closeGuide);
  const setArticle = useGuideStore((s) => s.setArticle);

  const location = findArticle(articleId ?? FIRST_ARTICLE_ID) ?? findArticle(FIRST_ARTICLE_ID);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeGuide()}>
      <RailDialogContent initialFocus="container" aria-label="Lux guide" width="2xl">
        <GuideNav articleId={location?.article.id ?? ""} onSelect={setArticle} />
        <div className="flex min-w-0 flex-1 flex-col">
          {location && <GuideArticleView location={location} onSelect={setArticle} />}
        </div>
      </RailDialogContent>
    </Dialog>
  );
}
