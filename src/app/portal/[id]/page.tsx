import { EmployeePortalScreen } from '@/components/portal-screen';

export default async function EmployeePortalPage({ params }: PageProps<'/portal/[id]'>) {
  const { id } = await params;
  return <EmployeePortalScreen employeeId={id} />;
}
