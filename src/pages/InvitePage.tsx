import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth';
import { Check, X, Users, MessageSquare } from 'lucide-react';

export function InvitePage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [invite, setInvite] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<boolean | null>(null);
  
  // Fetch invite details
  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteId) return;
      
      try {
        const response = await fetch(`/api/invites/${inviteId}`);
        if (response.ok) {
          const data = await response.json();
          setInvite(data);
        } else {
          const error = await response.json();
          setError(error.message || 'Invalid or expired invite');
        }
      } catch (err) {
        setError('Failed to load invite');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvite();
  }, [inviteId]);
  
  // Handle accepting invite
  const handleAcceptInvite = async () => {
    if (!inviteId || !user) return;
    
    setIsJoining(true);
    setJoinSuccess(null);
    
    try {
      const response = await fetch(`/api/invites/${inviteId}/accept`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setJoinSuccess(true);
        
        // Redirect after a short delay
        setTimeout(() => {
          if (data.roomId) {
            navigate(`/#room-${data.roomId}`);
          } else if (data.dmUserId) {
            navigate(`/#dm-${data.dmId}`);
          } else {
            navigate('/');
          }
        }, 1500);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to accept invite');
        setJoinSuccess(false);
      }
    } catch (err) {
      setError('An error occurred');
      setJoinSuccess(false);
    } finally {
      setIsJoining(false);
    }
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate(`/signin?redirect=/invite/${inviteId}`);
    }
  }, [user, loading, navigate, inviteId]);
  
  if (loading || (!user && !error)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Chatter Invite</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading invite details...' : 'Join a conversation on Chatter'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : error ? (
            <div className="py-8 text-center">
              <X className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <div className="py-4">
              {invite.roomId ? (
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-medium mb-2">
                    You've been invited to join a room
                  </h3>
                  {invite.roomName && (
                    <p className="text-lg font-semibold mb-4">{invite.roomName}</p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-medium mb-2">
                    You've been invited to a direct message
                  </h3>
                  {invite.dmUsername && (
                    <p className="text-lg font-semibold mb-4">with {invite.dmUsername}</p>
                  )}
                </div>
              )}
              
              {joinSuccess === true && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
                  <Check className="h-5 w-5 mr-2" />
                  Successfully joined! Redirecting...
                </div>
              )}
              
              {joinSuccess === false && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
                  <X className="h-5 w-5 mr-2" />
                  Failed to join. Please try again.
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button
            onClick={handleAcceptInvite}
            disabled={isLoading || isJoining || !!error || joinSuccess === true}
          >
            {isJoining ? 'Joining...' : 'Accept Invite'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}