import { redirect } from "next/navigation";
import { MasterList } from "@/components/admin/MasterList";
import { TargetForm } from "@/components/admin/TargetForm";
import { VersionList } from "@/components/admin/VersionList";
import { VersionSaveForm } from "@/components/admin/VersionSaveForm";
import { getSession } from "@/lib/auth";
import { getEvalItemVersions } from "@/lib/eval-item-versions";
import { prisma } from "@/lib/prisma";

export default async function TargetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/evaluations");

  const versions = await getEvalItemVersions();

  const targets = await prisma.target.findMany({
    orderBy: { index: "asc" },
    include: {
      _count: { select: { categories: true } },
      categories: {
        orderBy: { index: "asc" },
        include: {
          _count: { select: { evaluationItems: true } },
          evaluationItems: {
            orderBy: { index: "asc" },
            select: {
              id: true,
              no: true,
              name: true,
              description: true,
              evalCriteria: true,
            },
          },
        },
      },
    },
  });

  const data = targets.map((t) => ({
    id: t.id,
    no: t.no,
    name: t.name,
    canDelete: t._count.categories === 0,
    categories: t.categories.map((c) => ({
      id: c.id,
      targetId: c.targetId,
      no: c.no,
      name: c.name,
      canDelete: c._count.evaluationItems === 0,
      items: c.evaluationItems.map((item) => ({
        id: item.id,
        no: item.no,
        name: item.name,
        description: item.description,
        evalCriteria: item.evalCriteria,
      })),
    })),
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">マスタ管理</h2>
        <p className="text-sm text-gray-500">
          大分類・中分類・評価項目の追加・編集・削除、並び替えを行います。
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">
          大分類が登録されていません。
        </div>
      ) : (
        <MasterList targets={data} />
      )}

      <div className="mt-6">
        <TargetForm />
      </div>

      <div className="mt-6">
        <VersionSaveForm />
      </div>

      <div className="mt-6">
        <VersionList
          versions={versions.map((v) => ({
            id: v.id,
            name: v.name,
            createdAt: v.createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
            detailCount: v._count.details,
            fiscalYearCount: v._count.fiscalYears,
          }))}
        />
      </div>
    </div>
  );
}
