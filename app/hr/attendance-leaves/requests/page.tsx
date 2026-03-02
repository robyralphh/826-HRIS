import TimeRequestsView from '@/views/TimeRequests';

export const metadata = {
    title: 'Time Requests | HRIS',
    description: 'Manage employee overtime and undertime requests',
};

export default function TimeRequestsPage() {
    return <TimeRequestsView />;
}
