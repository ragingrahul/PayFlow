import { PayslipScreen } from '@/components/portal-screen';

export default async function PayslipPage({ params }: PageProps<'/portal/[id]/payslips/[itemId]'>) {
  const { id, itemId } = await params;
  return <PayslipScreen employeeId={id} payrollItemId={itemId} />;
}
