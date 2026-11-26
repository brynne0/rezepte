import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/BackLink/BackLink";

// Settings-style form card: shows the form, or a success message once done
const AccountFormCard = ({ title, success, errorMessage, children }) => (
  <>
    <BackLink fallback="/settings" />
    <Card className="w-full">
      <CardHeader className="flex flex-col items-stretch gap-4">
        <div className="relative flex w-full items-center justify-center">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </CardHeader>

      <CardContent>
        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p>{success.message}</p>
            <Button type="button" onClick={success.onAction}>
              {success.actionLabel}
            </Button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {children}
          </>
        )}
      </CardContent>
    </Card>
  </>
);

export default AccountFormCard;
