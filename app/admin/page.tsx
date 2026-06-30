import AdminPanel from '@/components/AdminPanel'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const params = await searchParams
  return <AdminPanel resetToken={params.reset ?? null} />
}
