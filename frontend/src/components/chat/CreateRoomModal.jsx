import { X } from "lucide-react";
import { useState } from "react";
import ApiService from "../../services/api-service";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function CreateRoomModal({ onClose, onRoomCreated }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "main_chat",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError("Room name is required");
      setLoading(false);
      return;
    }

    try {
      const newRoom = await ApiService.createRoom(
        formData.name.trim(),
        formData.type,
      );
      onRoomCreated(newRoom);
      onClose();
    } catch (err) {
      console.error("Failed to create room:", err);
      setError(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create New Room</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter room name"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Room Type</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-border rounded-md bg-background"
              >
                <option value="main_chat">Public Room</option>
              </select>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Room"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
