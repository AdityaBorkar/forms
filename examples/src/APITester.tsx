import { type FormEvent, useCallback, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function APITester() {
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const methodId = useId();
  const endpointId = useId();
  const responseId = useId();

  const testEndpoint = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const endpoint = formData.get("endpoint") as string;
      const url = new URL(endpoint, location.href);
      const method = formData.get("method") as string;
      const res = await fetch(url, { method });

      const data = await res.json();
      if (responseInputRef.current) {
        responseInputRef.current.value = JSON.stringify(data, null, 2);
      }
    } catch (error) {
      if (responseInputRef.current) {
        responseInputRef.current.value = String(error);
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <form className="flex items-center gap-2" onSubmit={testEndpoint}>
        <Label className="sr-only" htmlFor={methodId}>
          Method
        </Label>
        <Select defaultValue="GET" name="method">
          <SelectTrigger className="w-[100px]" id={methodId}>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
        <Label className="sr-only" htmlFor={endpointId}>
          Endpoint
        </Label>
        <Input
          defaultValue="/api/hello"
          id={endpointId}
          name="endpoint"
          placeholder="/api/hello"
          type="text"
        />
        <Button type="submit" variant="secondary">
          Send
        </Button>
      </form>
      <Label className="sr-only" htmlFor={responseId}>
        Response
      </Label>
      <Textarea
        className="min-h-[140px] resize-y font-mono"
        id={responseId}
        placeholder="Response will appear here..."
        readOnly
        ref={responseInputRef}
      />
    </div>
  );
}
